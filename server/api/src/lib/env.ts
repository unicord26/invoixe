// Loads the repo-root .env before anything touches process.env (Prisma, Supabase).
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { dirname, resolve, parse } from "node:path";

/**
 * Walk up from this file until a .env turns up.
 *
 * Don't count directory levels here: this module runs from src/lib/ under the
 * dev runner but from dist/ once bundled, so a fixed "../../../.." would point
 * somewhere different in production and silently load no .env at all.
 */
function findEnvFile(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  const { root } = parse(dir);
  while (true) {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) return candidate;
    if (dir === root) return undefined;
    dir = dirname(dir);
  }
}

/** Absolute path of the .env that was loaded, or null when running on ambient env vars. */
export const loadedEnvPath: string | null = findEnvFile() ?? null;

if (loadedEnvPath) {
  config({ path: loadedEnvPath });
}
