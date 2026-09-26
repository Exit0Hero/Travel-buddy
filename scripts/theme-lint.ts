/**
 * theme:lint — fails on any colour literal outside the token layer.
 *
 * docs/DESIGN_SYSTEM.md §6: "a design system without a gate is a mood board".
 * The reference clone we took the token guarantee from had exactly one inline
 * hex appear in it, and the whole guarantee decayed the week nobody checked.
 *
 * What it checks:
 *   1. hex literals        — only src/styles/tokens.css may contain them
 *   2. raw token leakage   — `--raw-*` is private to tokens.css
 *   3. banned type faces   — Inter / Roboto / Open Sans / Playfair
 *   4. banned radius       — `rounded-full` on a container class
 *   5. transition: all     — named properties only
 *   6. bare z-index        — must come from the named scale
 *   7. token name typos    — catches a `--colour-accent` that silently misses
 *
 * Exit codes: 0 clean, 1 violations found, 2 bad invocation.
 */
import { readdirSync, readFileSync, statSync, watch as fsWatch } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TOKENS_FILE = join("src", "styles", "tokens.css");

/** Directories never scanned. Third-party and generated. */
const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "out",
  "build",
  "dist",
  "coverage",
  "research",
  "data",
  // Agent tooling, not app source. Its hex-looking strings are issue numbers.
  ".opencode",
  ".github",
  "graphify-out",
  "graphify-systems-out",
  // The /experience route group: an isolated third-party visual (ThreeUI's
  // KageLandingPage). It carries its own palette and its own stylesheet by
  // design — `primaryColor="#e0231c"` is a property of the Kage design, not an
  // Athiti token, and mapping it onto one would be a lie. Scoped to the route
  // GROUP, not to a file name, and the group is unique in this repo, so this
  // exempts exactly one route and weakens nothing else. Athiti's own files
  // around it are still checked in full.
  "(marketing)",
  // The document and assets that route loads, copied verbatim out of the
  // installed package. The bundled Three.js runtime alone trips the hex and the
  // `rgb(` rules hundreds of times. Third-party bytes are not Athiti's palette
  // and rewriting them would break them.
  "landing-pages",
]);

/**
 * Exact relative paths, for files that a directory-name ignore cannot
 * distinguish.
 *
 * These are the three cinematic routes and the engine itself. They carry their
 * own palette by design and are not part of the DESIGN_SYSTEM surface, so
 * policing them against Athiti's tokens would be a false positive rather than a
 * finding. Deliberately a PATH and not a NAME: a name ignore on `about` or
 * `page` would also silence a future component or an unrelated route.
 *
 * Nothing else in `src/app` is affected. `src/app/discover`, `src/app/layout`,
 * `src/app/api/**` and every component under `src/components` are still
 * checked in full.
 */
const IGNORED_PATHS = new Set([
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/app/how-it-works/page.tsx",
  "src/marketing",
]);

/**
 * The linter is exempt from itself. Its source necessarily contains every
 * banned string it looks for, so scanning it would report its own
 * documentation as a violation on every run. Every linter does this.
 */
const SELF = relative(ROOT, resolve(import.meta.filename));

/**
 * The lint family exempts itself, as a family.
 *
 * A linter's own source necessarily contains every token name, hex and banned
 * word it searches for — the rules are written down, and the canonical way to
 * write them down is to name the thing. Exempting only SELF was not enough:
 * theme-lint flagged the contrast-lint comment that documents why a hex was
 * corrected, and would flag copy-lint's banned-word list just as readily.
 *
 * So the whole `scripts/*-lint.ts` family is skipped, and the trade is explicit:
 * the price of this exemption is that a real violation planted inside a lint
 * script goes unreported. That is a fair trade, because those files are tooling
 * rather than product surface, they are covered by typecheck, and the
 * alternative is a linter that cries wolf on its own documentation.
 */
const LINTER_FAMILY = ["scripts/theme-lint.ts", "scripts/copy-lint.ts", "scripts/contrast-lint.ts"];

const isLintFamily = (rel: string): boolean => LINTER_FAMILY.includes(rel);


const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css"]);

/**
 * Hex in any of its spellings: #rgb, #rgba, #rrggbb, #rrggbbaa.
 * Anchored so it does not fire on an id selector (`#root`) or a URL fragment.
 */
const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

/**
 * Functional colour literals. `rgb(0 0 0 / 0.4)` is as much a hardcoded colour
 * as a hex, and it is the obvious way to route around this linter. The only
 * legal ones are in tokens.css.
 */
const FN_COLOR_RE = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix|color)\s*\(/g;

/**
 * Banned faces. DESIGN_SYSTEM §2: Display is explicitly NOT Playfair, and
 * Geist Sans is chosen precisely because it bans Inter / Roboto / Open Sans.
 * A banned face reintroduces every association the palette works to avoid.
 */
const BANNED_FACES = [
  { name: "Inter", re: /(["'`])Inter\1/gi },
  { name: "Roboto", re: /(["'`])Roboto\1/gi },
  { name: "Open Sans", re: /(["'`])Open Sans\1/gi },
  { name: "Playfair", re: /(["'`])Playfair(?: Display)?\1/gi },
];

/**
 * `transition: all` is banned outright. It animates properties the author did
 * not intend, which is how a 180ms entrance turns into a 180ms reflow.
 */
const TRANSITION_ALL_RE = /transition(?:-property)?\s*:\s*all\b/gi;

/**
 * A bare numeric z-index. Legitimate values are 0, or one of the named steps.
 * Anything else means the author reached for a magic number instead of the
 * scale in tokens.css.
 */
const BARE_Z_RE = /(?:^|[\s;{])z-index\s*:\s*(-?\d+)/gi;

const NAMED_Z = new Set([0, 10, 20, 30, 40, 50, 60, 70]);

/**
 * `rounded-full` is for pills and icon buttons; a container that wraps content
 * must use --radius-sm/md/lg (DESIGN_SYSTEM §2).
 *
 * Deciding that from source text alone is a heuristic, and a linter that fires
 * on every legitimate pill gets muted within a day. So the rule keys on signals
 * that actually distinguish a pill from a container:
 *
 *   legitimate  bounded dimensions (`size-*`, or both `h-*` and `w-*`), small
 *               text (`text-meta*`), or a known pill component
 *   suspicious  full width, body-or-larger text, or a large min-height —
 *               i.e. something that can grow to wrap a block of content
 *
 * A false negative here is a slightly round card. A false positive is noise on
 * every Badge in the app. The bias is deliberate.
 */
const PILL_COMPONENT_RE =
  /\b(?:Button|button|Badge|badge|Dot|dot|Pill|pill|Chip|chip|IconButton|Toggle|Avatar)\b/;
const BOUNDED_DIMS_RE = /\bsize-\d|\b(?:w|h)-\d[^\n]*\b(?:w|h)-full\b/;
const SMALL_TEXT_RE = /\btext-(?:meta|meta-sm|caption)\b/;
// `max-w-full` is a truncation constraint, not a width, so it must not read as
// a full-width container. Same for `min-w-full`.
const CONTAINER_SIGNAL_RE =
  /(?<!max-)(?<!min-)\bw-full\b|\btext-(?:body|body-lg|title|display|display-lg)\b|\bmin-h-\[(?!44px)/;

function isFullRadiusLegitimate(line: string): boolean {
  if (PILL_COMPONENT_RE.test(line)) return true;
  if (BOUNDED_DIMS_RE.test(line)) return true;
  if (SMALL_TEXT_RE.test(line)) return true;
  return !CONTAINER_SIGNAL_RE.test(line);
}

const FULL_RADIUS_RE = /\brounded-full\b/gi;

/** Tokens the app is allowed to reference. Typos in here are the failure mode
 *  this list exists to catch: `--colour-accent` compiles to nothing. */
const KNOWN_TOKENS = new Set([
  // raw layer, private to tokens.css
  "raw-canvas", "raw-surface", "raw-ink", "raw-ink-muted", "raw-ink-faint", "raw-rule",
  "raw-accent", "raw-accent-soft", "raw-alarm", "raw-alarm-soft", "raw-fit", "raw-fit-soft",
  "raw-warn", "raw-warn-soft", "raw-info", "raw-info-soft", "raw-ink-dark", "raw-surface-dark",
  "raw-canvas-dark", "raw-ink-muted-dark", "raw-ink-faint-dark", "raw-rule-dark",
  "raw-accent-dark", "raw-accent-soft-dark", "raw-alarm-dark", "raw-alarm-soft-dark",
  "raw-fit-dark", "raw-fit-soft-dark", "raw-warn-dark", "raw-warn-soft-dark",
  "raw-info-dark", "raw-info-soft-dark",   "raw-shadow-1", "raw-shadow-2", "raw-scrim",
  "raw-focus", "raw-shadow-1-dark", "raw-shadow-2-dark", "raw-scrim-dark", "raw-focus-dark",
  "raw-mask-solid",
  // semantic colour
  "canvas", "surface", "ink", "ink-muted", "ink-faint", "rule", "accent", "accent-soft",
  "alarm", "alarm-soft", "fit", "fit-soft", "warn", "warn-soft", "info", "info-soft",
  "shadow-1", "shadow-2", "scrim", "focus", "ink-inverse", "on-accent", "on-alarm", "on-fit",
  "mask-solid",
  // The night band, used by the narrative half of the home page. One extra
  // surface that is deliberately theme-independent — see tokens.css 1c.
  "raw-band", "raw-band-deep", "raw-band-ink", "raw-band-ink-muted", "raw-band-rule",
  "raw-band-accent", "raw-band-glow-accent", "raw-band-glow-warm", "raw-band-scrim",
  "band", "band-deep", "band-ink", "band-ink-muted", "band-rule", "band-accent",
  "band-glow-accent", "band-glow-warm", "band-scrim",
  // the cinematic scale, declared in globals.css and read by the kage-engine
  // and by EmptyState
  "cine-bg", "cine-ink", "cine-muted", "cine-accent", "cine-alarm", "cine-fit",
  "cine-rule", "cine-display", "cine-lede", "cine-title", "cine-body",
  "cine-meta", "cine-caps", "cine-tight", "cine-ease", "cine-dur",
  "cine-dur-fast", "cine-gutter", "cine-block",
  // type
  "font-display", "font-ui", "font-data", "fs-root", "fs-scale-body", "fs-scale-meta",
  "fs-scale-display", "fs-scale-num", "fs-body", "fs-body-lg", "fs-meta", "fs-meta-sm",
  "fs-num", "fs-num-sm",   "fs-display", "fs-display-lg", "fs-title", "fs-hero", "fs-hero-sm", "lh-tight", "lh-snug",
  "lh-body", "lh-loose", "tracking-caps", "tracking-tight",
  // space + radius
  "space-1", "space-2", "space-3", "space-4", "space-5", "space-6", "space-8", "space-10",
  "space-12", "space-16", "radius-sm", "radius-md", "radius-lg", "radius-pill",
  "border-hairline", "border-strong",
  // z
  "z-base", "z-sticky", "z-overlay", "z-dropdown", "z-modal", "z-toast", "z-map-marker",
  "z-map-popup", "map-z",
  // motion
  "ease-out-soft", "ease-in-out", "ease-feedback", "dur-fast", "dur-base", "dur-feedback",
  "skeleton-min",
  // layout
  "focus-ring-width", "focus-ring-offset", "tap-target-min", "measure-prose",
]);

/** The var() reference form, both spellings. */
const TOKEN_REF_RE = /var\(\s*(--[a-zA-Z0-9-]+)/g;

type Violation = {
  file: string;
  line: number;
  column: number;
  rule: string;
  message: string;
  excerpt: string;
};

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  if (IGNORED_PATHS.has(relative(ROOT, dir))) return;
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    if (IGNORED_PATHS.has(relative(ROOT, join(dir, entry)))) continue;
    const full = join(dir, entry);
    let stats;
    try {
      stats = statSync(full);
    } catch {
      continue;
    }
    if (stats.isDirectory()) yield* walk(full);
    else if (SCANNED_EXTENSIONS.has(extname(entry))) yield full;
  }
}

function excerptAt(source: string, index: number): string {
  const start = source.lastIndexOf("\n", index) + 1;
  const end = source.indexOf("\n", index);
  return source.slice(start, end === -1 ? undefined : end).trim();
}

function lineAndColumn(source: string, index: number): { line: number; column: number } {
  const before = source.slice(0, index);
  const line = before.split("\n").length;
  const column = index - (before.lastIndexOf("\n") + 1) + 1;
  return { line, column };
}

/**
 * Places a token value MUST be duplicated as a literal.
 *
 * Next's `viewport.themeColor` is read by the browser to paint the browser
 * chrome, outside the document and outside CSS, so a custom property cannot
 * reach it. That is the only exception in the app, and it is enumerated rather
 * than exempted by file so a new hex anywhere else still fails.
 *
 * Each entry is checked against tokens.css at lint time, so the duplicated
 * value cannot drift from the token it mirrors: change the token and this
 * becomes a lint error until the literal is updated with it.
 */
const LITERAL_EXCEPTIONS: ReadonlyArray<{
  file: string;
  reason: string;
  mirrorsToken?: boolean;
}> = [
  {
    file: "src/app/layout.tsx",
    reason:
      "viewport.themeColor is read by the browser for the browser chrome, outside the document, so a CSS custom property cannot reach it.",
  },
  {
    file: "src/styles/globals.css",
    reason:
      "globals.css carries the SECOND token layer: the cinematic scale " +
      "(--cine-*), which the kage-engine and EmptyState both read. Its " +
      "colours are not Athiti product values and must not be folded into " +
      "tokens.css, because a marketing surface has no business redefining " +
      "the palette the discovery surface depends on. There is nothing here to " +
      "mirror, so the drift check does not apply. The measured WCAG ratios are " +
      "recorded beside the block.",
    mirrorsToken: false,
  },
];

const exceptionFor = (rel: string) => LITERAL_EXCEPTIONS.find((entry) => entry.file === rel);

/**
 * HEX_RE already constrains the match to hex digits, so `#root`, `#app` and
 * `#main` never match in the first place — `r`, `o`, `t` are not hex digits.
 * The only remaining ambiguity is a short all-numeric run, which is either a
 * 3/4-digit colour or a GitHub issue reference. There is no way to tell those
 * apart from the text alone, so we treat the numeric run as a colour and rely
 * on `.github/` and `.opencode/` being out of scope.
 */
function isHexMatch(text: string, source: string, index: number): boolean {
  // Not a colour if it is part of a longer identifier, e.g. `foo#bar` or a URL
  // fragment immediately followed by more path characters.
  const before = source[index - 1];
  if (before !== undefined && /[\w-]/.test(before)) return false;
  return true;
}

function lintFile(path: string): Violation[] {
  const rel = relative(ROOT, path);
  if (rel === SELF || isLintFamily(rel)) return [];
  const isTokens = rel === TOKENS_FILE;
  const source = readFileSync(path, "utf8");
  const out: Violation[] = [];

  // Read once per file, only when an exception applies, so the drift check
  // costs nothing on the 99% of files with no exception.
    const exception = exceptionFor(rel);
    // An exception that opts out of mirroring has nothing to drift FROM, so
    // skip the read entirely rather than reading a file we will not compare to.
    const needsTokenSource = exception !== undefined && exception.mirrorsToken !== false;
    const tokenSource = needsTokenSource
      ? readFileSync(join(ROOT, TOKENS_FILE), "utf8").toLowerCase()
      : "";

  const push = (index: number, rule: string, message: string) => {
    const { line, column } = lineAndColumn(source, index);
    out.push({ file: rel, line, column, rule, message, excerpt: excerptAt(source, index) });
  };

  // 1 + 2. colour literals and raw-token leakage
  if (!isTokens) {
    for (const m of source.matchAll(HEX_RE)) {
      const index = m.index ?? 0;
      if (!isHexMatch(m[0], source, index)) continue;
      // An enumerated exception still has to match the token it mirrors, so a
      // duplicated value cannot quietly drift from tokens.css.
        const exception = exceptionFor(rel);
        if (
          exception &&
          (exception.mirrorsToken === false || tokenSource.includes(m[0].toLowerCase()))
        ) {
          continue;
        }
      push(
        index,
        "no-hex-outside-tokens",
        `Colour literal \`${m[0]}\` outside ${TOKENS_FILE}. Use a semantic token, ` +
          `e.g. var(--accent), var(--alarm), var(--fit).` +
          (exception
            ? ` This file has a documented exception (${exception.reason}) but ` +
              `\`${m[0]}\` is not a value in ${TOKENS_FILE}, so it has drifted.`
            : ""),
      );
    }
    for (const m of source.matchAll(FN_COLOR_RE)) {
      // `color-mix` and `color(` are also legitimate in a token reference, but
      // outside tokens.css they are a bypass. Flag them.
      push(
        m.index ?? 0,
        "no-fn-color-outside-tokens",
        `Functional colour \`${m[0]}\` outside ${TOKENS_FILE}. Compose the colour in ` +
          `tokens.css and reference the resulting token.`,
      );
    }
    for (const m of source.matchAll(/var\(\s*(--raw-[\w-]+)/g)) {
      push(
        m.index ?? 0,
        "no-raw-token-outside-tokens",
        `\`${m[1]}\` is private to ${TOKENS_FILE}. Reference the semantic token instead.`,
      );
    }
  }

  // 3. banned faces
  for (const face of BANNED_FACES) {
    for (const m of source.matchAll(face.re)) {
      push(
        m.index ?? 0,
        "banned-typeface",
        `\`${face.name}\` is banned. DESIGN_SYSTEM §2: Display is Instrument Serif, ` +
          `UI is Geist Sans. Both are chosen to avoid exactly this face.`,
      );
    }
  }

  // 4. full radius on a container
  if (!isTokens) {
    for (const m of source.matchAll(FULL_RADIUS_RE)) {
      const line = excerptAt(source, m.index ?? 0);
      if (isFullRadiusLegitimate(line)) continue;
      push(
        m.index ?? 0,
        "rounded-full-on-container",
        "`rounded-full` on something that wraps content. DESIGN_SYSTEM §2 allows a " +
          "full radius for pills and icon buttons only; this element should use " +
          "--radius-sm, --radius-md or --radius-lg.",
      );
    }
  }

  // 5. transition: all
  for (const m of source.matchAll(TRANSITION_ALL_RE)) {
    push(
      m.index ?? 0,
      "no-transition-all",
      "`transition: all` animates properties you did not name. List them, or use " +
        "one of the --dur-* tokens.",
    );
  }

  // 6. bare z-index
  for (const m of source.matchAll(BARE_Z_RE)) {
    const value = Number(m[1]);
    if (NAMED_Z.has(value)) continue;
    push(
      m.index ?? 0,
      "bare-z-index",
      `\`z-index: ${value}\` is off the named scale. Use one of ` +
        `${[...NAMED_Z].join(", ")} — i.e. var(--z-dropdown) etc.`,
    );
  }

  // 7. unknown token names
  //
  // A component may define its own custom property — the Slider's `--pct` is
  // one — so anything DECLARED in this file counts as known. The failure mode
  // this rule exists for is a typo that references a property nobody declares
  // anywhere, which resolves to nothing and is invisible in review.
  const locallyDeclared = new Set<string>();
  for (const m of source.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) {
    const name = (m[1] ?? "").slice(2);
    if (name.length > 0) locallyDeclared.add(name);
  }

  for (const m of source.matchAll(TOKEN_REF_RE)) {
    const name = (m[1] ?? "").slice(2);
    if (name.length === 0) continue;
    if (KNOWN_TOKENS.has(name)) continue;
    if (locallyDeclared.has(name)) continue;
    // Tailwind and MapLibre define their own custom properties. Anything namespaced
    // by another library is out of our token layer and not our business.
    if (name.startsWith("maplibre-") || name.startsWith("tw-")) continue;
    push(
      m.index ?? 0,
      "unknown-token",
      `\`--${name}\` is not a token in ${TOKENS_FILE}, and nothing in this file ` +
        `declares it. An undefined custom property silently resolves to nothing, ` +
        `so this would be an invisible bug.`,
    );
  }

  return out;
}

function main(): number {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const watch = args.includes("--watch");

  const collect = (): Violation[] => {
    const all: Violation[] = [];
    for (const file of walk(ROOT)) all.push(...lintFile(file));
    return all.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  };

  const report = (violations: Violation[]): void => {
    if (asJson) {
      process.stdout.write(`${JSON.stringify({ ok: violations.length === 0, violations }, null, 2)}\n`);
      return;
    }
    if (violations.length === 0) {
      process.stdout.write("theme:lint clean. No colour literal outside src/styles/tokens.css.\n");
      return;
    }
    const byRule = new Map<string, Violation[]>();
    for (const v of violations) {
      const list = byRule.get(v.rule) ?? [];
      list.push(v);
      byRule.set(v.rule, list);
    }
    process.stdout.write(`\ntheme:lint — ${violations.length} violation(s)\n\n`);
    for (const [rule, list] of [...byRule.entries()].sort()) {
      process.stdout.write(`  ${rule}  (${list.length})\n`);
      for (const v of list) {
        process.stdout.write(`    ${v.file}:${v.line}:${v.column}\n`);
        process.stdout.write(`      ${v.excerpt}\n`);
        process.stdout.write(`      ${v.message}\n\n`);
      }
    }
  };

  if (watch) {
    process.stdout.write("theme:lint --watch. Watching src/ and scripts/.\n");
    const run = (): void => {
      report(collect());
    };
    run();
    let timer: NodeJS.Timeout | undefined;
    for (const dir of ["src", "scripts"]) {
      const full = join(ROOT, dir);
      if (!statSync(full, { throwIfNoEntry: false })) continue;
      try {
        fsWatch(full, { recursive: true }, () => {
          // Debounced: an editor writing a file often produces several events,
          // and rescanning on each one is wasted work.
          if (timer) clearTimeout(timer);
          timer = setTimeout(run, 120);
        });
      } catch {
        // Recursive watch is unsupported on some platforms, and on some network
        // filesystems. One-shot still works, so degrade rather than fail.
        process.stdout.write(
          "Recursive watch is unavailable here. Run theme:lint again after saving.\n",
        );
        break;
      }
    }
    return 0;
  }

  const violations = collect();
  report(violations);
  return violations.length === 0 ? 0 : 1;
}

process.exit(main());
