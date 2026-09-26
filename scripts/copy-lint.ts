/**
 * copy-lint — the banned-copy rules from DESIGN_SYSTEM §4, checked in CI
 * alongside theme:lint.
 *
 * theme:lint guards the token layer. This guards the other half of the design
 * system: the words. A design system is a palette AND a set of rules about what
 * you are allowed to say, and the second half decays just as quietly.
 *
 * WHY AN AST AND NOT REGEX. A first attempt scanned for `...` with a regex and
 * reported 60 hits, every one of them a spread operator, a type annotation or a
 * word inside a comment. User-visible copy is a syntactic category, not a text
 * pattern, so it has to be found syntactically. The TypeScript compiler API is
 * already a devDependency, so this walks the AST and only ever looks at:
 *
 *   - `JsxText`                      text between tags
 *   - `JsxAttribute` string values   label, title, placeholder, aria-label…
 *   - string literals in a COPY_PROP set   the same, for props on components
 *   - `NoSubstitutionTemplateLiteral`  a message with no interpolation
 *
 * Comments, identifiers, imports, types and every other string in the file are
 * structurally out of scope, which is why a comment may name a banned word in
 * order to explain why it is banned.
 *
 * Rules:
 *   1. no emoji in code or copy  — one icon family, lucide
 *   2. "..." in copy             — a real ellipsis character is required
 *   3. no banned filler words    — the DESIGN_SYSTEM §4 list
 *   4. no colon reveals
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import ts from "typescript";

const ROOT = resolve(import.meta.dirname, "..");

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
  ".opencode",
  ".github",
  "graphify-out",
  "graphify-systems-out",
]);

const SCANNED = new Set([".ts", ".tsx"]);

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


/**
 * Emoji and pictographic blocks. Arrows and geometric shapes are excluded:
 * those are punctuation and maths, not decoration, and an arrow is legitimate
 * in prose.
 */
const EMOJI_RE =
  /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{20E3}]/u;

/**
 * Glyphs the design system REQUIRES, which must not be caught by the emoji
 * rule above.
 *
 * Both are in the Dingbats block (U+2700-27BF), so a naive emoji range flags
 * them — and the first version of this linter did exactly that, banning the
 * two characters DESIGN_SYSTEM §3 rule 7 explicitly prescribes:
 *
 *   "Accessibility as yes/no pills with glyph AND word — `✓ Step-free` /
 *    `✗ Not step-free` in fit/alarm."
 *
 * They are the right call for a different reason the spec gives: colour is never
 * the only signal, so the pill needs a glyph as well as a word, and a tick and a
 * cross are the universally understood ones. They are text symbols, not
 * decoration. Everything else in those blocks stays banned.
 */
const ALLOWED_GLYPHS = new Set(["\u2713", "\u2717"]); // ✓ ✗

/** Banned words. DESIGN_SYSTEM §4 plus the usual tail of generated prose. */
const BANNED_WORDS = [
  "simply",
  "effortlessly",
  "dive in",
  "unlock",
  "seamless",
  "seamlessly",
  "elevate",
  "game-changer",
  "revolutionary",
  "cutting-edge",
  "hassle-free",
  "world-class",
  "delve",
  "tapestry",
  "testament",
  "breathtaking",
  "must-visit",
];

/**
 * A clause ending in a colon that exists to introduce the point.
 *
 * The trailing colon is REQUIRED and not optional. An earlier version matched
 * the phrase alone and flagged "Nothing fits all your constraints. Here is what
 * gives." — which is the exact copy DESIGN_SYSTEM §4 prescribes for the
 * constraints-too-tight state, complete with the deliberate full stop before
 * "Here is". A rule that bans the design system's own recommended string is
 * worse than no rule, because it forces a copy change to a worse sentence.
 *
 * Matched on "here is" and "here's" alike, since the first version only handled
 * the contraction and let "Here is the thing: it works" through.
 */
const COLON_REVEAL_RE =
  /(?:\bhere'?s|\bhere\s+is)\s+(?:the\s+)?(?:thing|why|what)\s*:|\b(?:but|and)\s+that'?s\s*:|\bintroducing\s*:|\bconsider\s+this\s*:|\bguess\s+what\s*:|\bremember\s*:/gi;

const ASCII_ELLIPSIS_RE = /\.{2,}/;

/**
 * Props whose string value is shown to a person. Anything not in this set is
 * treated as an identifier, a class name, a URL or a key and is not copy.
 */
const COPY_PROPS = new Set([
  "label",
  "title",
  "placeholder",
  "description",
  "narrative",
  "message",
  "body",
  "hint",
  "summary",
  "reason",
  "detail",
  "blurb",
  "headline",
  "cta",
  "eyebrow",
  "emptyTitle",
  "value",
  "name",
]);

type Violation = {
  file: string;
  line: number;
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
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let stats;
    try {
      stats = statSync(full);
    } catch {
      continue;
    }
    if (stats.isDirectory()) yield* walk(full);
    else if (SCANNED.has(extname(entry))) yield full;
  }
}

function checkCopy(
  text: string,
  rel: string,
  line: number,
  excerpt: string,
  out: Violation[],
): void {
  if (text.length === 0) return;

  // Trim, and ignore whitespace-only JSX text, which is formatting.
  if (text.trim().length === 0) return;

  for (const m of text.matchAll(new RegExp(EMOJI_RE.source, "gu"))) {
    const glyph = m[0];
    if (glyph !== undefined && ALLOWED_GLYPHS.has(glyph)) continue;
    out.push({
      file: rel,
      line,
      rule: "no-emoji",
      message:
        "Emoji " + JSON.stringify(glyph) + " in copy. DESIGN_SYSTEM §4 bans " +
        "emoji in code and copy; use lucide-react, one family, strokeWidth standardised.",
      excerpt,
    });
  }

  if (ASCII_ELLIPSIS_RE.test(text)) {
    out.push({
      file: rel,
      line,
      rule: "ascii-ellipsis",
      message: "`...` in copy. DESIGN_SYSTEM §4 requires a real ellipsis character.",
      excerpt,
    });
  }

  for (const word of BANNED_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    if (re.test(text)) {
      out.push({
        file: rel,
        line,
        rule: "banned-word",
        message: `\`${word}\` is on the DESIGN_SYSTEM §4 banned list.`,
        excerpt,
      });
    }
  }

  const reveal = new RegExp(COLON_REVEAL_RE.source, "gi");
  if (reveal.test(text)) {
    out.push({
      file: rel,
      line,
      rule: "colon-reveal",
      message:
        "Colon reveal. DESIGN_SYSTEM §4 bans the construction where a clause " +
        "ending in a colon introduces the point.",
      excerpt,
    });
  }
}

function lintFile(path: string): Violation[] {
  const rel = relative(ROOT, path);
  if (rel === SELF || isLintFamily(rel)) return [];

  const source = readFileSync(path, "utf8");
  const out: Violation[] = [];
  const lines = source.split("\n");

  const lineOf = (pos: number): number =>
    source.slice(0, pos).split("\n").length;

  const sourceFile = ts.createSourceFile(
    rel,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const visit = (node: ts.Node): void => {
    // 1. JSX text between tags.
    if (ts.isJsxText(node)) {
      const line = lineOf(node.getStart(sourceFile));
      checkCopy(node.text, rel, line, (lines[line - 1] ?? "").trim(), out);
    }

    // 2. A string-valued prop on any element, host or component.
    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(sourceFile);
      const isAria = name.startsWith("aria-");
      if (COPY_PROPS.has(name) || isAria) {
        const init = node.initializer;
        if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
          const line = lineOf(init.getStart(sourceFile));
          checkCopy(init.text, rel, line, (lines[line - 1] ?? "").trim(), out);
        }
      }
    }

    // 3. Plain string literals in a plain `const x = "..."` — the shape copy
    //    takes when it is built up in a fixture or a helper.
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const init = node.initializer;
      if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
        const declName = node.name.getText(sourceFile);
        // A name that looks like a CSS class, a key, a url or an import path.
        const isIdentifierish =
          /^[a-z][A-Za-z0-9]*$/.test(declName) === false ||
          /class|css|key|id|token|color|hex|url|path|import|require/i.test(declName);
        if (!isIdentifierish) {
          const line = lineOf(init.getStart(sourceFile));
          checkCopy(init.text, rel, line, (lines[line - 1] ?? "").trim(), out);
        }
      }
    }

    // 4. Object literal properties whose key is a copy prop.
    if (ts.isPropertyAssignment(node)) {
      const key = node.name.getText(sourceFile).replace(/^["']|["']$/g, "");
      if (COPY_PROPS.has(key)) {
        const init = node.initializer;
        if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
          const line = lineOf(init.getStart(sourceFile));
          checkCopy(init.text, rel, line, (lines[line - 1] ?? "").trim(), out);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return out;
}

function main(): number {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");

  const violations: Violation[] = [];
  for (const file of walk(ROOT)) violations.push(...lintFile(file));
  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  if (asJson) {
    process.stdout.write(
      `${JSON.stringify({ ok: violations.length === 0, violations }, null, 2)}\n`,
    );
    return violations.length === 0 ? 0 : 1;
  }

  if (violations.length === 0) {
    process.stdout.write("copy:lint clean. No emoji, no banned filler, no colon reveals.\n");
    return 0;
  }

  const byRule = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byRule.get(v.rule) ?? [];
    list.push(v);
    byRule.set(v.rule, list);
  }
  process.stdout.write(`\ncopy:lint — ${violations.length} violation(s)\n\n`);
  for (const [rule, list] of [...byRule.entries()].sort()) {
    process.stdout.write(`  ${rule}  (${list.length})\n`);
    for (const v of list) {
      process.stdout.write(`    ${v.file}:${v.line}\n`);
      process.stdout.write(`      ${v.excerpt}\n`);
      process.stdout.write(`      ${v.message}\n\n`);
    }
  }
  return 1;
}

process.exit(main());
