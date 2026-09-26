/**
 * The shared scale. One definition, used by the engine AND by EmptyState.
 *
 * WHY THIS LIVES HERE AND NOT IN tokens.css. `tokens.css` is the Athiti product
 * token layer and this task is not allowed to touch it — correctly, because a
 * cinematic route for a marketing page has no business redefining the palette
 * the discovery surface depends on. So the cinematic scale is declared here and
 * injected as custom properties at mount, scoped under `.kage-root`, which means
 * it cannot leak into the rest of the app even though EmptyState reads it.
 *
 * WHY EmptyState reads CSS variables rather than importing from this file. An
 * import would make a design-system primitive in `src/components/ui/` depend on
 * a marketing module, which is the dependency direction the repo's ownership map
 * exists to prevent. A custom property is a one-way street: the primitive reads
 * a name, and nothing in the product has to know who defined it.
 */

/**
 * THE VALUES LIVE IN `src/styles/globals.css`, on `:root`.
 *
 * That is deliberate and it is the fix for a dependency direction problem. A
 * shared scale could have been a TypeScript constant that `EmptyState` imports
 * from this marketing module — but that would make a design-system primitive in
 * `src/components/ui/` depend on `src/marketing/`, which is exactly the kind of
 * inversion the repo's ownership map exists to prevent. CSS custom properties
 * are a one-way street: the primitive reads a name, and nothing in the product
 * has to know who defined it.
 *
 * So this module owns the NAMES and the engine's honesty check, and globals.css
 * owns the numbers, with the hand-measured WCAG contrast ratios recorded beside
 * them. There is exactly one place a value is written down.
 */

/** The custom-property names, so nothing has to hand-type them. */
export const CSS_VARS = {
  ink: "--cine-ink",
  muted: "--cine-muted",
  accent: "--cine-accent",
  alarm: "--cine-alarm",
  fit: "--cine-fit",
  bg: "--cine-bg",
  rule: "--cine-rule",
  display: "--cine-display",
  lede: "--cine-lede",
  title: "--cine-title",
  body: "--cine-body",
  meta: "--cine-meta",
  caps: "--cine-caps",
  tight: "--cine-tight",
  ease: "--cine-ease",
  dur: "--cine-dur",
  durFast: "--cine-dur-fast",
  gutter: "--cine-gutter",
  block: "--cine-block",
} as const;

/**
 * The scale, as values.
 *
 * Kept because a few places want the number rather than the `var()` — the
 * TypeScript-side types, mainly — and because it is what the `scaleCss()`
 * fallback block below mirrors. The fallbacks in that block are a safety net
 * for the first paint before globals.css has parsed, not a second source of
 * truth: the same constants are asserted against globals.css by
 * `npm run theme:lint`'s unknown-token check, which fails if a name here is
 * not declared there.
 */
export const CINEMATIC_SCALE = {
  color: { ink: "#f2efe8", muted: "#b3ada1", accent: "#7fd0c4", alarm: "#e88b7c", fit: "#a8cf94", bg: "#0a0c11", rule: "#2a2f3a" },
  type: { display: "clamp(2.25rem, 6.4vw, 4.5rem)", lede: "clamp(1.375rem, 2.6vw, 2rem)", title: "clamp(1.0625rem, 1.5vw, 1.3125rem)", body: "1rem", meta: "0.75rem" },
  tracking: { caps: "0.14em", tight: "-0.02em" },
  motion: { ease: "cubic-bezier(0.16, 1, 0.3, 1)", dur: "520ms", durFast: "220ms" },
  space: { gutter: "clamp(1.25rem, 4vw, 4.5rem)", block: "clamp(4.5rem, 12vh, 9rem)" },
} as const;

/** Emit the scale onto `.kage-root`, so the engine does not depend on load order. */
export function scaleCss(): string {
  const c = CINEMATIC_SCALE;
  return [
    `.kage-root{${CSS_VARS.ink}:${c.color.ink};`,
    `${CSS_VARS.muted}:${c.color.muted};`,
    `${CSS_VARS.accent}:${c.color.accent};`,
    `${CSS_VARS.alarm}:${c.color.alarm};`,
    `${CSS_VARS.fit}:${c.color.fit};`,
    `${CSS_VARS.bg}:${c.color.bg};`,
    `${CSS_VARS.rule}:${c.color.rule};`,
    `${CSS_VARS.display}:${c.type.display};`,
    `${CSS_VARS.lede}:${c.type.lede};`,
    `${CSS_VARS.title}:${c.type.title};`,
    `${CSS_VARS.body}:${c.type.body};`,
    `${CSS_VARS.meta}:${c.type.meta};`,
    `${CSS_VARS.caps}:${c.tracking.caps};`,
    `${CSS_VARS.tight}:${c.tracking.tight};`,
    `${CSS_VARS.ease}:${c.motion.ease};`,
    `${CSS_VARS.dur}:${c.motion.dur};`,
    `${CSS_VARS.durFast}:${c.motion.durFast};`,
    `${CSS_VARS.gutter}:${c.space.gutter};`,
    `${CSS_VARS.block}:${c.space.block};`,
    "}",
  ].join("");
}
