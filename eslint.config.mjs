/**
 * ESLint flat config.
 *
 * WHY THIS FILE AND NOT `next lint`. `next lint` is deprecated in Next.js 16 and,
 * worse, it INTERACTIVELY PROMPTS when no config is present — so wiring it into
 * CI as a gate meant the job would sit there waiting for a keystroke forever
 * rather than passing or failing. The documented migration is the ESLint CLI
 * directly, which is what CI runs.
 *
 * `eslint` and `eslint-config-next` were already devDependencies, so this costs
 * no change to package.json — which TASKS.md makes a group decision.
 *
 * `eslint-config-next@15.5` still ships LEGACY eslintrc configs, not flat ones,
 * so they go through FlatCompat. On the Next 16 upgrade these become
 * `import nextVitals from "eslint-config-next/core-web-vitals"` directly and
 * the compat layer can go.
 *
 * `@eslint/eslintrc` is used rather than added to package.json because it is
 * already present as ESLint's own dependency; promoting it to a direct
 * dependency is the tidier move and is a group decision per TASKS.md.
 */
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "research/**",
      "data/**",
      ".opencode/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // The overlay family manages focus, Escape and scroll lock by hand, so a
      // genuine missing dependency in an effect there is a real bug.
      "react-hooks/exhaustive-deps": "warn",

      // Unused code is a maintenance cost and a reviewer cost. The contract is
      // full of legitimately nullable fields, so no-unnecessary-condition is
      // deliberately NOT enabled: a strict version of it produces hundreds of
      // false positives, and a linter that cries wolf is one nobody runs.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          // `_`-prefixed names are the conventional escape hatch, and this
          // codebase uses it deliberately (e.g. `void leg`) to mark a value
          // that is destructured only to satisfy a type.
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default config;
