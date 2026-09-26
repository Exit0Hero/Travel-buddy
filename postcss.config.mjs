/** PostCSS. Next.js 15 + Tailwind v4: the plugin is @tailwindcss/postcss and
 *  the theme lives in CSS, not here. This file exists because Next requires
 *  it, and because it is the one place we can add a step without touching
 *  package.json — which is Abhijit's, and a group decision per TASKS.md. */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
