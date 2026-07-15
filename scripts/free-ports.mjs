// Frees the dev ports before `npm run dev` starts.
//
// Why this exists: on Windows, Ctrl+C does not reliably kill the grandchild dev
// servers (`node --watch`, `next dev`). They survive, keep holding ports
// 3000/5000, and the next `npm run dev` dies with EADDRINUSE — which then leaves
// another orphan behind, so the problem feeds itself.
//
// Killing the listening PID is NOT enough. A dev server runs as two processes:
//
//     node --watch src/main.ts     <- the watcher (parent)
//       └─ node src/main.ts        <- holds the port (child)
//
// Kill only the child and the watcher notices it died and respawns it, taking
// the port straight back. So we walk up from the listener and kill the watcher
// that owns it. We never kill node processes at large (that would take down the
// editor's own tooling), and never anything in our own ancestry (that would kill
// the very `npm run dev` invoking this).
//
// usage: node scripts/free-ports.mjs [--quiet] <port> [port...]

import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const ports = args.filter((a) => !a.startsWith("--")).map(Number).filter(Boolean);
if (ports.length === 0) {
  console.error("usage: node scripts/free-ports.mjs [--quiet] <port> [port...]");
  process.exit(1);
}

const warn = (s) => console.log(`\x1b[33m!\x1b[0m ${s}`);
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const run = (cmd, cmdArgs) => {
  try {
    return execFileSync(cmd, cmdArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return ""; // no matches — these tools exit non-zero when nothing is found
  }
};

const isWin = process.platform === "win32";

/** PIDs listening on `port`. */
function listenersOn(port) {
  const pids = new Set();
  if (isWin) {
    for (const line of run("netstat", ["-ano", "-p", "TCP"]).split(/\r?\n/)) {
      const cols = line.trim().split(/\s+/);
      // Proto  Local            Foreign  State      PID
      if (cols.length < 5 || cols[3] !== "LISTENING") continue;
      // Match the port exactly: ":5000" must not match ":50001".
      if (!new RegExp(`:${port}$`).test(cols[1])) continue;
      pids.add(cols[4]);
    }
  } else {
    for (const pid of run("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"]).split(/\s+/)) {
      if (pid) pids.add(pid);
    }
  }
  pids.delete(String(process.pid));
  return [...pids];
}

/** One snapshot of the process table: pid -> { ppid, cmd }. */
function processTable() {
  const table = new Map();
  if (isWin) {
    // Emit an explicit delimiter rather than CSV: command lines are full of
    // quotes ("node" "C:\path\next" dev), which ConvertTo-Csv escapes by
    // doubling — and a regex that tries to unpick that silently mis-parses the
    // command line, which is the one field this all hinges on.
    const SEP = "|~|";
    const out = run("powershell", [
      "-NoProfile",
      "-Command",
      `Get-CimInstance Win32_Process | ForEach-Object { $_.ProcessId.ToString() + '${SEP}' + $_.ParentProcessId.ToString() + '${SEP}' + ($_.CommandLine -replace "\`r?\`n", " ") }`,
    ]);
    for (const line of out.split(/\r?\n/)) {
      const parts = line.split(SEP);
      if (parts.length < 3) continue;
      table.set(parts[0].trim(), { ppid: parts[1].trim(), cmd: parts.slice(2).join(SEP) });
    }
  } else {
    for (const line of run("ps", ["-eo", "pid=,ppid=,args="]).split("\n")) {
      const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
      if (m) table.set(m[1], { ppid: m[2], cmd: m[3] });
    }
  }
  return table;
}

/** Our own ancestry — killing any of it would kill the running `npm run dev`. */
function ownAncestry(table) {
  const mine = new Set();
  let cur = String(process.pid);
  for (let i = 0; i < 20 && cur && table.has(cur); i++) {
    mine.add(cur);
    cur = table.get(cur).ppid;
  }
  if (cur) mine.add(cur);
  return mine;
}

// A watcher respawns its child, so it is the thing that must die. Match on the
// distinguishing flag rather than on the executable: the same watcher shows up
// as `node --watch …` or as `"C:\Program Files\nodejs\node.exe" --watch …`
// depending on how it was launched, and anchoring to the exe name misses the
// quoted form. Narrow by construction — only file-watching dev servers carry
// these — and the caller additionally refuses to climb into its own ancestry.
// The optional quote matters: Next's supervisor shows up as
//   "node" "…\next\dist\bin\next" dev -p 3000
// so `next` and `dev` are separated by a quote, not just whitespace.
const WATCHER = /--watch\b|\bnext(-\w+)*["']?\s+dev\b|\bnext-server\b/i;

/**
 * The process to kill so `pid` stays dead: the outermost watcher ancestor, or
 * `pid` itself when it has no watcher parent.
 */
function killTargetFor(pid, table, mine) {
  let target = pid;
  let cur = table.get(pid)?.ppid;
  for (let i = 0; i < 6 && cur && table.has(cur); i++) {
    if (mine.has(cur)) break; // never climb into our own process tree
    const { cmd, ppid } = table.get(cur);
    if (WATCHER.test(cmd)) target = cur;
    else break; // stop at the first non-watcher (npm, shell, explorer…)
    cur = ppid;
  }
  return target;
}

const kill = (pid) => (isWin ? run("taskkill", ["/PID", pid, "/F", "/T"]) : run("kill", ["-9", pid]));

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

let freed = 0;
for (const port of ports) {
  const listeners = listenersOn(port);
  if (listeners.length === 0) continue;

  const table = processTable();
  const mine = ownAncestry(table);

  for (const pid of listeners) {
    const target = killTargetFor(pid, table, mine);
    kill(target);
    warn(
      target === pid
        ? `freed port ${port} — killed stale PID ${pid}`
        : `freed port ${port} — killed stale watcher PID ${target} ${dim(`(was respawning PID ${pid})`)}`
    );
    freed++;
  }

  // Verify rather than assume: a surviving watcher would otherwise hand the port
  // straight back and the API would fail with EADDRINUSE moments later.
  let stillHeld = [];
  for (let i = 0; i < 10; i++) {
    sleep(200);
    stillHeld = listenersOn(port);
    if (stillHeld.length === 0) break;
  }
  if (stillHeld.length > 0) {
    console.error(
      `\x1b[31m✗\x1b[0m Port ${port} is STILL held by PID ${stillHeld.join(", ")} after killing.\n` +
        `  Something is respawning it. Close the terminal running it, or:\n` +
        `    ${isWin ? `taskkill /PID ${stillHeld[0]} /F /T` : `kill -9 ${stillHeld[0]}`}\n`
    );
    process.exit(1); // fail loudly instead of starting a doomed dev server
  }
}

// --quiet keeps the normal path silent: this runs before every `npm run dev`,
// and "nothing to do" is not news. A kill is always reported either way, since
// that is a fact worth seeing (and explains where a process went).
if (freed === 0 && !quiet) {
  console.log(dim(`ports ${ports.join(", ")} already free`));
}
