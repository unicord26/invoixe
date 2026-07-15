// Flat config. `next lint` is deprecated in Next 15 (removed in 16), so lint
// runs through the ESLint CLI directly.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  {
    // components/ui is vendored shadcn/ui — regenerated, not hand-maintained.
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "components/ui/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Tailwind/PostCSS configs are CommonJS by design; require() is correct there.
    files: ["*.config.js", "*.config.mjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];
