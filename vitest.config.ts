import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Vitest config.
 *
 * Exists mainly for the `@/*` alias. `tsconfig.json` maps it for `tsc`, but
 * Vitest does not read `paths` on its own — without this, every test that
 * imports from the frozen contract fails to resolve and the suite is
 * unrunnable, which is the worst possible reason for a test suite to not run.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(root, "src"),
    },
  },
  test: {
    // Node environment, not jsdom: every test in this suite is about module
    // resolution and export shape, and none of them render.
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
