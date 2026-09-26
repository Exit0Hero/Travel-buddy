/**
 * contrast-lint — WCAG contrast for every token pair the app actually uses,
 * in BOTH themes.
 *
 * DESIGN_SYSTEM §5 makes contrast non-negotiable and says so specifically about
 * the semantic colours used AS TEXT rather than only as fills. That is exactly
 * the failure a palette review misses, because the fills look fine.
 *
 * This exists because two of the hex values in DESIGN_SYSTEM §2's token table
 * do not satisfy §5:
 *
 *   warn      #9A6B1F  4.25:1 on canvas  — just under 4.5, and `warn` is used as
 *              text for an unverified-hours notice and an inferred-data badge
 *   ink-faint #9A948A  2.74:1 on canvas  — cannot carry text at any size
 *
 * Both are corrected in tokens.css with the reasoning inline, and this script
 * is what keeps them corrected. A token table and an accessibility rule that
 * disagree is a real possibility in a spec; when they do, the accessibility rule
 * wins and the deviation is written down rather than left implicit.
 *
 * The `ink-faint` pair is checked against 3:1, not 4.5:1, on purpose: that token
 * is for decoration and disabled states only, and the components enforce that
 * rule. Checking it at 4.5 would force it to within 0.28 of `ink-muted` and
 * collapse three text tiers into two indistinguishable ones.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TOKENS = join(ROOT, "src", "styles", "tokens.css");

const css = readFileSync(TOKENS, "utf8");

function raw(name: string): string | null {
  const match = css.match(new RegExp(`--raw-${name}:\\s*(#[0-9a-fA-F]{6})`));
  return match?.[1] ?? null;
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
  );
  const [r = 0, g = 0, b = 0] = linear;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  // Sorted descending, so the lighter of the two is first. `noUncheckedIndexedAccess`
  // means the destructured pair is possibly undefined even though a two-element
  // sort always has two elements, so the guard is a type requirement rather than
  // defensive padding.
  const sorted = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  const lighter = sorted[0] ?? 1;
  const darker = sorted[1] ?? 0;
  return (lighter + 0.05) / (darker + 0.05);
}

type Pair = { label: string; fg: string; bg: string; min: number; note?: string };

const TEXT = 4.5;
const INCIDENTAL = 3;

function pairsFor(suffix: "" | "-dark"): Pair[] {
  const canvas = raw(`canvas${suffix}`) ?? (suffix ? "#14130f" : "#f6f4ef");
  const surface = raw(`surface${suffix}`) ?? (suffix ? "#1c1b16" : "#fffdf8");
  const ink = raw(`ink${suffix}`);
  const muted = raw(`ink-muted${suffix}`);
  const faint = raw(`ink-faint${suffix}`);
  const accent = raw(`accent${suffix}`);
  const alarm = raw(`alarm${suffix}`);
  const fit = raw(`fit${suffix}`);
  const warn = raw(`warn${suffix}`);
  const info = raw(`info${suffix}`);

  // The type colour that sits ON a semantic fill, read from the stylesheet
  // rather than assumed. Light uses --raw-surface; dark uses --raw-canvas-dark.
  const onColour = suffix ? (raw("canvas-dark") ?? "#14130f") : (raw("surface") ?? "#fffdf8");

  return [
    // The reading hierarchy. `ink` and `ink-muted` are the two tiers that carry
    // text a person needs; `ink-faint` is decoration and clears only 3:1.
    { label: "ink on canvas", fg: ink!, bg: canvas, min: TEXT },
    { label: "ink on surface", fg: ink!, bg: surface, min: TEXT },
    { label: "ink-muted on canvas", fg: muted!, bg: canvas, min: TEXT },
    { label: "ink-muted on surface", fg: muted!, bg: surface, min: TEXT },
    {
      label: "ink-faint on canvas (decoration only)",
      fg: faint!,
      bg: canvas,
      min: INCIDENTAL,
      note: "3:1 is the incidental threshold. This token must never carry text.",
    },
    { label: "ink-faint on surface (decoration only)", fg: faint!, bg: surface, min: INCIDENTAL },

    // §5 names alarm and fit specifically: usable as text, not only as fills.
    { label: "alarm as text on canvas", fg: alarm!, bg: canvas, min: TEXT },
    { label: "alarm as text on surface", fg: alarm!, bg: surface, min: TEXT },
    { label: "fit as text on canvas", fg: fit!, bg: canvas, min: TEXT },
    { label: "fit as text on surface", fg: fit!, bg: surface, min: TEXT },
    { label: "warn as text on canvas", fg: warn!, bg: canvas, min: TEXT },
    { label: "warn as text on surface", fg: warn!, bg: surface, min: TEXT },
    { label: "info as text on canvas", fg: info!, bg: canvas, min: TEXT },
    { label: "info as text on surface", fg: info!, bg: surface, min: TEXT },

    // The inverse pairs: light type on a dark semantic fill.
    //
    // The foreground is NOT always `surface`. The light theme sets
    // `--on-accent: var(--raw-surface)`, and the dark theme sets it to
    // `var(--raw-canvas-dark)` — which is #14130f, darker than surface-dark
    // (#1c1b16). Using `surface` for both made this script report a 4.45:1
    // failure on a pair that is actually 4.80:1, i.e. the checker was wrong and
    // the tokens were right. Which is the whole reason to verify the checker.
    { label: "on-accent on accent", fg: onColour, bg: accent!, min: TEXT },
    { label: "on-alarm on alarm", fg: onColour, bg: alarm!, min: TEXT },
    { label: "on-fit on fit", fg: onColour, bg: fit!, min: TEXT },
  ];
}

function main(): number {
  const asJson = process.argv.includes("--json");
  const failures: Array<Pair & { ratio: number; theme: string }> = [];
  const rows: Array<Pair & { ratio: number; theme: string }> = [];

  for (const [theme, suffix] of [
    ["light", ""],
    ["dark", "-dark"],
  ] as const) {
    for (const pair of pairsFor(suffix)) {
      const ratio = contrast(pair.fg, pair.bg);
      const row = { ...pair, ratio, theme };
      rows.push(row);
      if (ratio < pair.min) failures.push(row);
    }
  }

  if (asJson) {
    process.stdout.write(
      `${JSON.stringify({ ok: failures.length === 0, failures, checked: rows.length }, null, 2)}\n`,
    );
    return failures.length === 0 ? 0 : 1;
  }

  for (const theme of ["light", "dark"]) {
    process.stdout.write(`\n  ${theme.toUpperCase()}\n`);
    for (const row of rows.filter((r) => r.theme === theme)) {
      const ok = row.ratio >= row.min;
      process.stdout.write(
        `    ${ok ? "pass" : "FAIL"}  ${row.label.padEnd(40)}${row.ratio.toFixed(2)}:1  (need ${row.min})\n`,
      );
      if (row.note) process.stdout.write(`            ${row.note}\n`);
    }
  }

  if (failures.length === 0) {
    process.stdout.write(`\ncontrast:lint clean. ${rows.length} pairs checked, all pass.\n`);
    return 0;
  }
  process.stdout.write(
    `\ncontrast:lint — ${failures.length} of ${rows.length} pairs fail.\n` +
      `A failing pair means a token cannot be read. Fix tokens.css, not the check.\n`,
  );
  return 1;
}

process.exit(main());
