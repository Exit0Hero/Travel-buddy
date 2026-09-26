"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "../cn";

/**
 * Button — the only interactive primitive in the set that renders a real
 * `<button>`. Everything that looks like a button but navigates is a Link, and
 * anything that toggles state is a Toggle, so the semantics stay honest.
 *
 * Variants are semantic, never decorative. `danger` is the only one that uses
 * `alarm`, and it exists for destructive confirmation, not for emphasis.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent border border-accent hover:brightness-110",
  secondary: "bg-surface text-ink border border-rule hover:bg-accent-soft",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-accent-soft",
  danger: "bg-alarm text-on-alarm border border-alarm hover:brightness-110",
  quiet: "bg-transparent text-ink-muted border border-transparent hover:text-ink hover:underline",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-meta gap-1.5",
  // 44px minimum tap target, per DESIGN_SYSTEM §5.
  md: "min-h-11 px-4 text-body gap-2",
  lg: "min-h-12 px-6 text-body-lg gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction. The label stays mounted so the
   *  button does not change width mid-submit — a layout shift on every click
   *  is the single most common cause of a mis-tapped double submit. */
  loading?: boolean;
  /** Announced while loading. Defaults to the visible label. */
  loadingLabel?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** Square icon-only button. Keeps a 44px target regardless of icon size. */
  iconOnly?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    loadingLabel,
    iconLeft,
    iconRight,
    iconOnly = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  const isDisabled = disabled === true || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium",
        "transition-[background-color,border-color,color,filter,opacity] duration-[var(--dur-fast)]",
        "ease-[var(--ease-out-soft)]",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        iconOnly && "aspect-square px-0",
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" strokeWidth={2} />
      ) : (
        iconLeft
      )}
      {iconOnly ? null : <span className="truncate">{children}</span>}
      {loading && !iconOnly ? (
        <span className="sr-only" role="status">
          {loadingLabel ?? children}
        </span>
      ) : null}
      {!loading && iconRight}
    </button>
  );
});
