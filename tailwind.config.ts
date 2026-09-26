import type { Config } from "tailwindcss";

/**
 * Tailwind v4 is CSS-first: the theme is declared with `@theme` inside
 * `src/styles/tokens.css`, not here. Loading this file with `@config` in
 * `src/styles/globals.css` only contributes what CSS cannot express.
 *
 * Karan owns this file and `src/styles/**` (TASKS.md). If you need to add a
 * utility or a variant, add it to tokens.css — a hex or a size added here
 * would sit outside the token layer that `npm run theme:lint` guards.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    // Rendered by the server components we call into.
    "./src/features/**/*.{ts,tsx}",
  ],
  // No `theme.extend` on purpose. Colour, type, space, radius, z-index, motion
  // and elevation all live in tokens.css, so there is exactly one place to read
  // a value from and exactly one place for theme:lint to police.
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
