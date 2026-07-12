// Loads the repo-root .env before anything touches process.env (Prisma, Supabase).
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// server/api/src/lib -> repo root is four levels up
config({ path: resolve(here, "../../../../.env") });
