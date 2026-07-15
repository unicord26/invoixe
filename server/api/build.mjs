// Production build for @invoixe/api.
//
// Why a bundler and not plain `tsc`:
//
//  1. tsconfig uses moduleResolution "Bundler", which permits extensionless
//     relative imports ("./lib/env"). Node's ESM loader requires the .js
//     extension and tsc does not add one, so a tsc-only dist never boots.
//  2. The @invoixe/* workspace packages export raw TypeScript ("main":
//     "./src/index.ts"). Node cannot load .ts at runtime, so they have to be
//     compiled into the output rather than resolved at runtime.
//
// Why SWC does the transform instead of esbuild's built-in TS loader:
// esbuild cannot emit emitDecoratorMetadata (it needs type information it
// deliberately never collects). Without design:paramtypes, Nest's DI resolves
// every constructor dependency to undefined — silently, with no boot error.
// SWC emits the metadata, so it transforms and esbuild only bundles.

import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { transform } from "@swc/core";

/** Transform .ts through SWC so decorator metadata survives into the bundle. */
const swcTransform = {
  name: "swc-transform",
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      const source = await readFile(args.path, "utf8");
      const { code } = await transform(source, {
        filename: args.path,
        sourceMaps: "inline",
        jsc: {
          parser: { syntax: "typescript", decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: "es2022",
        },
        module: { type: "es6" },
      });
      return { contents: code, loader: "js" };
    });
  },
};

/**
 * Externalize every bare specifier except our own workspace packages.
 *
 * Third-party packages must stay external: Nest lazily require()s optional
 * peers (class-validator, @nestjs/microservices…) and Prisma's runtime does
 * dynamic require() of node builtins — neither survives an ESM bundle.
 *
 * Listing package.json dependencies is not enough: transitive runtime deps
 * (@prisma/client, reached through @invoixe/db) are not listed there but must
 * still resolve from node_modules at runtime.
 */
const externalizeNonWorkspace = {
  name: "externalize-non-workspace",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === "entry-point") return undefined;
      const p = args.path;
      // Relative/absolute paths: let esbuild resolve and bundle them.
      if (p.startsWith(".") || p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p)) return undefined;
      // Our workspace packages ship raw .ts — bundle them in.
      if (p.startsWith("@invoixe/")) return undefined;
      // Everything else (incl. node: builtins) resolves from node_modules at runtime.
      return { path: p, external: true };
    });
  },
};

await build({
  entryPoints: ["src/main.ts"],
  outfile: "dist/main.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  plugins: [externalizeNonWorkspace, swcTransform],
  logLevel: "info",
});
