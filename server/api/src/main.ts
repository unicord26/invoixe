import { loadedEnvPath } from "./lib/env"; // must be first — loads .env before Prisma/Supabase read it
import "reflect-metadata"; // Nest DI reads design:paramtypes from here
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { AppModule } from "./app.module";
import { HealthService } from "./health/health.controller";

const PORT = Number(process.env.API_PORT ?? 5000);

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

const ok = (label: string, detail: string) => console.log(`  ${green("✓")} ${label.padEnd(9)} ${detail}`);
const fail = (label: string, detail: string) => console.log(`  ${red("✗")} ${label.padEnd(9)} ${red(detail)}`);

/** Prisma errors span many lines; keep the banner to one line per check. */
const oneLine = (s = "", max = 110) => {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max) + "…" : flat;
};

/** Is Supabase Auth answering? Login and the auth guard both depend on it. */
async function checkSupabaseAuth(): Promise<{ ok: boolean; ms: number; error?: string }> {
  const started = Date.now();
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY ?? "" },
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, ms: Date.now() - started, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, ms: Date.now() - started, error: e instanceof Error ? e.message : "unreachable" };
  }
}

/**
 * Startup handshake: prove the backing services answer before claiming ready.
 * A failure here is reported, not fatal — the API still serves, and /api/health
 * keeps reporting 503 so the cause stays visible rather than surfacing later as
 * mystery 500s on the first real request.
 */
async function reportStartup(app: INestApplication, origins: string[]) {
  console.log(`\n  ${dim("Invoixe API")}`);
  ok("env", loadedEnvPath ? dim(loadedEnvPath) : dim("ambient environment (no .env file found)"));

  const [db, auth] = await Promise.all([app.get(HealthService).supabase(), checkSupabaseAuth()]);

  if (db.db === "connected") ok("database", `Supabase Postgres — healthy ${dim(`(${db.latencyMs}ms)`)}`);
  else fail("database", `Supabase Postgres UNREACHABLE — ${oneLine(db.error)}`);

  if (auth.ok) ok("auth", `Supabase Auth — reachable ${dim(`(${auth.ms}ms)`)}`);
  else fail("auth", `Supabase Auth unreachable — ${oneLine(auth.error)} (login will fail)`);

  ok("cors", dim(origins.join(", ")));
  ok("api", `http://localhost:${PORT}`);

  const healthy = db.db === "connected" && auth.ok;
  console.log(healthy ? `  ${green("✓")} ready\n` : `  ${red("✗")} started with degraded services — see above\n`);
}

async function bootstrap() {
  // Nest logs a line per mapped route (79 of them) plus a line per module on
  // every start/restart, which buries the startup report below. Errors and
  // warnings still come through; set API_VERBOSE=true to get the rest back.
  const verbose = process.env.API_VERBOSE === "true";
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: verbose ? ["log", "error", "warn", "debug", "verbose"] : ["error", "warn"],
  });

  // Security headers (CSP is left to the Next app; this is a JSON API).
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

  // CORS: restrict to the known frontend origin(s). Set FRONTEND_ORIGINS (comma-
  // separated) in production; defaults cover local dev.
  const allowedOrigins = (process.env.FRONTEND_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
      // Allow same-origin / non-browser (curl, server-to-server) requests with no Origin.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
  });

  // Cap request bodies — bulk import is the largest legitimate payload.
  app.useBodyParser("json", { limit: "2mb" });

  // Blanket rate limit (generous; blunts abuse without hindering normal use).
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "rate_limited" },
    })
  );

  // Routes keep their /api prefix so the client needs no changes.
  app.setGlobalPrefix("api");

  app.enableShutdownHooks();
  await app.listen(PORT);
  await reportStartup(app, allowedOrigins);
}

bootstrap().catch((err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n✗ Port ${PORT} is already in use — an old API process is still holding it.\n` +
        `  Run \`npm run dev:clean\` from the repo root to free it, then start again.\n`
    );
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
