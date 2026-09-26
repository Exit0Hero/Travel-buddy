"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "../cn";

/**
 * Disclosure — the one correct expand/collapse pattern.
 *
 * The bug this avoids: collapsing with `max-height: 0` or `display: none` and
 * leaving the content in the accessibility tree. Keyboard focus then walks into
 * invisible controls, and a screen reader announces links the user cannot see.
 *
 * The fix has two halves and both are required:
 *   1. `inert` on the collapsed panel — removes it from the tab order AND from
 *      the a11y tree, in one attribute, with no JS bookkeeping to drift
 *   2. `grid-template-rows: 1fr -> 0fr` for the collapse — animatable, unlike
 *      `height: auto`, and it does not require knowing the content height
 *
 * `inert` is a real attribute in React 19's type definitions, so this needs no
 * `any` cast and no polyfill for the browsers that matter.
 */
export interface DisclosureProps {
  /** The always-visible trigger. Must be a real button — see below. */
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Uncontrolled initial state only; pair with `onOpenChange` if you need it. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
  panelClassName?: string;
  /** Announced when the panel opens. Optional. */
  label?: string;
}

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  onOpenChange,
  className,
  panelClassName,
  label,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className={cn("border-t border-rule", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className={cn(
          "flex w-full items-center justify-between gap-2 py-3 text-left",
          "min-h-11",
          "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]",
          "hover:text-accent",
        )}
      >
        <span className="min-w-0">{summary}</span>
        <ChevronDown
          aria-hidden
          strokeWidth={2}
          className={cn(
            "size-4 shrink-0 transition-transform duration-[var(--dur-base)]",
            "ease-[var(--ease-in-out)]",
            open && "rotate-180",
          )}
        />
      </button>

      {/*
        grid-rows animates from 0fr to 1fr without a height measurement.
        `inert` is what actually removes the collapsed content from the tab
        order. Reduced motion collapses the duration globally in tokens.css, so
        the grid still snaps closed and stays closed.
      */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-[var(--dur-base)]",
          "ease-[var(--ease-in-out)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className={cn("pb-3", panelClassName)} id={panelId} role="region" aria-label={label}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface ControlledDisclosureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  label?: string;
}

/**
 * The same pattern, controlled, for the one case where the parent must know:
 * a "why not that" panel that opens from a card click has to reveal the map
 * marker at the same moment, so the two must not drift.
 */
export function ControlledDisclosure({
  open,
  onOpenChange,
  summary,
  children,
  className,
  panelClassName,
  label,
}: ControlledDisclosureProps) {
  const panelId = useId();

  return (
    <div className={cn("border-t border-rule", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex w-full min-h-11 items-center justify-between gap-2 py-3 text-left",
          "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]",
          "hover:text-accent",
        )}
      >
        <span className="min-w-0">{summary}</span>
        <ChevronDown
          aria-hidden
          strokeWidth={2}
          className={cn(
            "size-4 shrink-0 transition-transform duration-[var(--dur-base)]",
            "ease-[var(--ease-in-out)]",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-[var(--dur-base)]",
          "ease-[var(--ease-in-out)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className={cn("pb-3", panelClassName)} id={panelId} role="region" aria-label={label}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
