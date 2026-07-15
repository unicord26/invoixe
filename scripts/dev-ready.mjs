// Prints one summary line once BOTH dev servers answer.
//
// Runs as a third `concurrently` task next to the api and web servers. Neither
// of them can report this on its own: the API doesn't know whether Next has
// compiled, and Next doesn't know whether the database is reachable. Polling
// from outside is what lets a single line say the whole stack is usable.
//
// Purely informational — it never fails the dev command. If a service never
// comes up, its own output already says why; this just stops waiting.

const API = `http://localhost:${process.env.API_PORT ?? 5000}`;
const WEB = `http://localhost:${process.env.WEB_PORT ?? 3000}`;
const TIMEOUT_MS = 90_000;
const POLL_MS = 700;

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe(url, init) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), ...init });
    return res;
  } catch {
    return null;
  }
}

/** Resolves with the API's health payload, or null if it never answers. */
async function waitForApi(deadline) {
  while (Date.now() < deadline) {
    const res = await probe(`${API}/api/health`);
    // 503 still means the API is up — it's the database underneath that's down,
    // and the payload tells us which. Either way, stop waiting.
    if (res && (res.ok || res.status === 503)) {
      return await res.json().catch(() => null);
    }
    await sleep(POLL_MS);
  }
  return null;
}

async function waitForWeb(deadline) {
  while (Date.now() < deadline) {
    const res = await probe(WEB);
    if (res) return true; // any response means Next is serving
    await sleep(POLL_MS);
  }
  return false;
}

const deadline = Date.now() + TIMEOUT_MS;
const started = Date.now();
const [health, webUp] = await Promise.all([waitForApi(deadline), waitForWeb(deadline)]);
const secs = ((Date.now() - started) / 1000).toFixed(1);

if (!health || !webUp) {
  const missing = [!health && "api", !webUp && "web"].filter(Boolean).join(" and ");
  console.log(`\n${yellow("!")} ${bold("Invoixe")} — gave up waiting for ${missing} after ${TIMEOUT_MS / 1000}s. See its output above.\n`);
  process.exit(0);
}

const db = health.supabase?.db === "connected";

// Don't headline "ready" when the database is down — the app will fail on the
// first screen that loads data, and a green tick here would be the last thing
// you'd suspect. Say what is actually true.
const headline = db
  ? `${green("✓")} ${bold("Invoixe is ready")} ${dim(`in ${secs}s`)}`
  : `${yellow("!")} ${bold("Invoixe started, but the database is unreachable")} ${dim(`in ${secs}s`)}`;
const dbNote = db
  ? green(`database healthy (${health.supabase.latencyMs}ms)`)
  : yellow("database UNREACHABLE — see the api output above");

console.log(
  `\n${headline}\n` +
    `    ${bold("web")}  ${WEB}\n` +
    `    ${bold("api")}  ${API}  ${dim("·")} ${dbNote}\n`
);
