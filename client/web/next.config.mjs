import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Next only reads .env files from this directory, never the monorepo root, so
// the NEXT_PUBLIC_* values used to be copied into client/web/.env and
// client/web/.env.local too. Three copies of the same keys meant .env.local
// silently won, and rotating a key in the root .env changed nothing here —
// which fails confusingly at runtime instead of loudly at boot.
//
// Loading the root .env here puts those keys into process.env before Next
// inlines NEXT_PUBLIC_*, making the repo-root .env the single source of truth
// for both the server and the client.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: resolve(repoRoot, ".env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile the raw-TS workspace packages we import.
  transpilePackages: ["@invoixe/core", "@invoixe/types"],
  devIndicators: false,
};

export default nextConfig;
