"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/components/cn";
import { SegmentedControl } from "@/components/ui/Controls";

/**
 * Per-tier font scaling, with a per-tier control.
 *
 * The tokens are `--fs-scale-body`, `--fs-scale-meta` and `--fs-scale-display`
 * (DESIGN_SYSTEM §2). Each tier reads its own scale, so one accessibility
 * slider rescales the whole app and the three stay independently adjustable —
 * a reader who wants larger body text but not a giant display face gets exactly
 * that, which a single global multiplier cannot do.
 *
 * The rule from the reference, and the reason the tiers exist separately: the
 * VALUE AND THE UNIT ALWAYS SHARE A TIER. Never multiply a meta value by the
 * display scale. That is enforced in tokens.css, not here — this component only
 * sets the three multipliers.
 *
 * Preferences persist to localStorage and are re-applied by the inline script in
 * `ThemeScript` before first paint, so a reload does not flash the default size
 * and then jump.
 */
const STORAGE_KEY = "travelbuddy:prefs";

type Theme = "system" | "light" | "dark";
type FontScale = { body: number; meta: number; display: number };
type Motion = "full" | "reduced";

type Prefs = { theme: Theme; fontScale: FontScale; motion: Motion };

const DEFAULT_PREFS: Prefs = {
  theme: "system",
  fontScale: { body: 1, meta: 1, display: 1 },
  motion: "full",
};

const STEPS = [0.9, 1, 1.15, 1.3, 1.5] as const;

function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      theme: parsed.theme ?? DEFAULT_PREFS.theme,
      // Merged per tier, so a stored object missing one key does not reset the
      // others to undefined and collapse the type scale.
      fontScale: { ...DEFAULT_PREFS.fontScale, ...(parsed.fontScale ?? {}) },
      motion: parsed.motion ?? DEFAULT_PREFS.motion,
    };
  } catch {
    // A corrupt value must not break the page. Defaults are always safe.
    return DEFAULT_PREFS;
  }
}

function applyPrefs(prefs: Prefs): void {
  const root = document.documentElement;
  const resolved: "light" | "dark" =
    prefs.theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : prefs.theme;

  root.setAttribute("data-theme", resolved);
  root.style.setProperty("--fs-scale-body", String(prefs.fontScale.body));
  root.style.setProperty("--fs-scale-meta", String(prefs.fontScale.meta));
  root.style.setProperty("--fs-scale-display", String(prefs.fontScale.display));

  if (prefs.motion === "reduced") root.setAttribute("data-motion", "reduced");
  else root.removeAttribute("data-motion");
}

export interface AccessibilityControlsProps {
  className?: string;
}

export function AccessibilityControls({ className }: AccessibilityControlsProps) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  // Read after mount, not during render: this is a server-rendered page and
  // localStorage does not exist there, so reading it in the initialiser would
  // desynchronise the server and client HTML.
  useEffect(() => {
    const stored = readPrefs();
    setPrefs(stored);
    applyPrefs(stored);
  }, []);

  const update = useCallback((next: Partial<Prefs>) => {
    setPrefs((current) => {
      const merged = { ...current, ...next };
      applyPrefs(merged);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Private mode or a full quota. The preference still applies for this
        // session, which is better than refusing to change it at all.
      }
      return merged;
    });
  }, []);

  const stepIndex = (value: number) => {
    const index = STEPS.indexOf(value as (typeof STEPS)[number]);
    return index === -1 ? 1 : index;
  };

  return (
    <div className={cn("min-w-0 space-y-4", className)}>
      <div>
        <h2 className="text-caps text-ink-muted">Reading comfort</h2>

        <fieldset className="mt-3">
          <legend className="text-meta text-ink-muted">Text size</legend>
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                update({
                  fontScale: {
                    ...prefs.fontScale,
                    body: STEPS[Math.max(0, stepIndex(prefs.fontScale.body) - 1)] ?? 1,
                  },
                })
              }
              disabled={stepIndex(prefs.fontScale.body) === 0}
              aria-label="Smaller text"
              className="grid size-11 place-items-center rounded-md border border-rule bg-surface text-body text-ink transition-colors duration-[var(--dur-fast)] hover:bg-accent-soft disabled:opacity-45"
            >
              A
              <span className="text-meta-sm">−</span>
            </button>
            <output aria-live="polite" className="min-w-16 text-center text-num-sm text-ink">
              {Math.round(prefs.fontScale.body * 100)}%
            </output>
            <button
              type="button"
              onClick={() =>
                update({
                  fontScale: {
                    ...prefs.fontScale,
                    body: STEPS[Math.min(STEPS.length - 1, stepIndex(prefs.fontScale.body) + 1)] ?? 1,
                  },
                })
              }
              disabled={stepIndex(prefs.fontScale.body) === STEPS.length - 1}
              aria-label="Larger text"
              className="grid size-11 place-items-center rounded-md border border-rule bg-surface text-body-lg text-ink transition-colors duration-[var(--dur-fast)] hover:bg-accent-soft disabled:opacity-45"
            >
              A
              <span className="text-meta-sm">+</span>
            </button>
          </div>
          <p className="mt-1.5 text-meta-sm text-ink-muted">
            Body, metadata and headings scale separately, so you can enlarge what
            you read without enlarging everything.
          </p>
        </fieldset>

        <div className="mt-4">
          <span className="text-meta text-ink-muted">Theme</span>
          <div className="mt-1.5">
            <SegmentedControl
              label="Theme"
              value={prefs.theme}
              onChange={(theme) => update({ theme })}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>
        </div>

        <div className="mt-4">
          <span className="text-meta text-ink-muted">Motion</span>
          <div className="mt-1.5">
            <SegmentedControl
              label="Motion"
              value={prefs.motion}
              onChange={(motion) => update({ motion })}
              options={[
                { value: "full", label: "Full" },
                { value: "reduced", label: "Reduced" },
              ]}
            />
          </div>
          <p className="mt-1.5 text-meta-sm text-ink-muted">
            Reduced disables the meter animation and every transition. The
            feasibility bar still fills — it just arrives without moving.
          </p>
        </div>
      </div>
    </div>
  );
}
