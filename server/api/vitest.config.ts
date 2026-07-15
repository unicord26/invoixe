import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Runs before each spec is imported — see the file for why it is needed.
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.spec.ts"],
  },
});
