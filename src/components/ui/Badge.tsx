import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../cn";

/**
 * Badge — the smallest semantic surface in the app.
 *
 * `rounded-full` is correct here and only here (plus icon buttons): a pill is
 * the one container whose shape is the point.
 *
 * Every tone pairs a fill with a text colour that clears 4.5:1 against it.
 * DESIGN_SYSTEM §5 is explicit that `alarm` and `fit` must work as *text*, not
 * only as fills, so the `-soft` variants carry the semantic hue as the text
 * colour rather than a washed-out grey.
 */
export type BadgeTone =
  | "neutral"
  | "accent"
  | "fit"
  | "warn"
  | "alarm"
  | "info"
  | "outline";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-accent-soft text-ink border-transparent",
  accent: "bg-accent text-on-accent border-transparent",
  // Soft fill, semantic text: the hue is legible and the block stays quiet.
  fit: "bg-fit-soft text-fit border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  alarm: "bg-alarm-soft text-alarm border-transparent",
  info: "bg-info-soft text-info border-transparent",
  outline: "bg-transparent text-ink-muted border-rule",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: "sm" | "md";
  icon?: ReactNode;
  children: ReactNode;
}

export function Badge({ tone = "neutral", size = "sm", icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-meta-sm" : "px-2.5 py-1 text-meta",
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon ? <span aria-hidden className="shrink-0">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

/**
 * A yes/no fact. DESIGN_SYSTEM §3 rule 7: accessibility is shown as pills with
 * a glyph AND a word, because the *negatives* are the decision-grade
 * information and colour alone would hide them from a colourblind reader.
 *
 * `unknown` is a real third state, not a false. The contract models
 * accessibility as nullable booleans precisely because OSM's `wheelchair` tag
 * is 3-state, so collapsing unknown into "no" would misrepresent the provider.
 */
export function FactPill({
  value,
  children,
  className,
}: {
  value: boolean | null;
  children: ReactNode;
  className?: string;
}) {
  const tone =
    value === null
      ? "bg-accent-soft text-ink-muted border-transparent"
      : value
        ? "bg-fit-soft text-fit border-transparent"
        : "bg-alarm-soft text-alarm border-transparent";

  const glyph = value === null ? "unknown" : value ? "yes" : "no";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-meta-sm font-medium",
        tone,
        className,
      )}
    >
      {/* Glyph is decorative; the word carries the meaning. */}
      <span aria-hidden className="font-data leading-none">
        {glyph === "yes" ? "✓" : glyph === "no" ? "✗" : "?"}
      </span>
      {children}
    </span>
  );
}
