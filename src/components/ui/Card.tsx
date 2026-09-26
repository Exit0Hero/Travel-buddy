import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "../cn";

/**
 * Card — the surface every other component sits on.
 *
 * Two rules it enforces structurally rather than by convention:
 *  - the divider is a 1px border, never a shadow. A shadow standing in for a
 *    divider reads as a smudge at 1x and as a gap at 2x.
 *  - radius is md by default. `rounded-full` is banned on containers, which
 *    is what `theme:lint` checks for.
 */
export type CardTone = "surface" | "canvas" | "inset";

const TONES: Record<CardTone, string> = {
  surface: "bg-surface border-rule",
  canvas: "bg-canvas border-rule",
  inset: "bg-accent-soft border-transparent",
};

/** Which element each `as` value resolves to, so its props stay honest. */
type CardElement = {
  div: HTMLDivElement;
  article: HTMLElement;
  section: HTMLElement;
  li: HTMLLIElement;
};

export type CardProps<E extends keyof CardElement = "div"> = {
  /** Rendered element. Defaults to a div. */
  as?: E;
  tone?: CardTone;
  /** Raised cards use one of the two sub-0.05 shadow levels. */
  raised?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
} & Omit<HTMLAttributes<CardElement[E]>, "as">;

const PADDING = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

export function Card<E extends keyof CardElement = "div">({
  tone = "surface",
  raised = false,
  padding = "md",
  as,
  className,
  children,
  ...rest
}: CardProps<E>) {
  const classes = cn(
    "rounded-md border",
    TONES[tone],
    raised && "shadow-raise-1",
    PADDING[padding],
    className,
  );

  // Destructuring a generic prop type loses the link between `as` and the
  // element-specific handlers, so React's own `ElementType` is the escape
  // hatch here: the public signature still ties `as` to its element, and this
  // is the single place the two are re-joined. Four call sites, one cast,
  // instead of a union that JSX cannot narrow.
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag className={classes} {...(rest as HTMLAttributes<HTMLElement>)}>
      {children}
    </Tag>
  );
}

export interface CardHeaderProps {
  /** Small caps label above the title. The mono metadata cluster. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Rendered right-aligned: a count, a rating, a menu. */
  aside?: ReactNode;
  className?: string;
}

export function CardHeader({ eyebrow, title, aside, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="text-caps text-ink-muted">{eyebrow}</div> : null}
        <div className="text-title text-ink">{title}</div>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

/** The 1px rule. One component so nobody hand-rolls a border colour. */
export function CardDivider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-rule", className)} />;
}
