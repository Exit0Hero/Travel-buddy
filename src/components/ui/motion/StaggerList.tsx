"use client";

import { Children, type ReactNode } from "react";

import { cn } from "../../cn";
import { useReducedMotion } from "./useReducedMotion";

/**
 * StaggerList — a set of siblings that arrive in order.
 *
 * PHASE 0 SCOPE. Minimal version, animation off by default. See `CrossFade`
 * for why. The `animate` prop is the same deliberate opt-in.
 *
 * WHERE IT IS MEANT TO BE USED (Phases 1 and 2). A list of `FactPill`s, a set
 * of result cards, a gate's check rows. Anywhere the COUNT is the information —
 * where seeing four pills land in sequence tells you "there are four access
 * facts" faster than four pills appearing at once.
 *
 * WHERE IT MUST NOT BE USED. On a long list. A stagger is `index × step`, so a
 * twenty-row itinerary staggers for a second and a half and the last row is
 * late enough that the reader has already scrolled past it. Above roughly six
 * children, render them plainly. The cap below enforces that rather than
 * trusting every future call site to remember it.
 *
 * THE DELAY IS SET INLINE, NOT IN A STYLESHEET, and that is on purpose: a
 * per-child `animation-delay` cannot be expressed by a utility class, and
 * writing it inline keeps the value in the same expression as the index that
 * produced it. The number is a custom property so it still reads as a token
 * rather than a magic constant.
 *
 * REDUCED MOTION. No delay, no animation, no index maths. The children render
 * as a plain list. This matters more here than for any other component in the
 * set, because a stagger is the one effect whose entire purpose is to sequence
 * things in time — there is nothing left of it once the timing is removed, so
 * under reduced motion it is not "the same list, faster", it is "a list".
 */
export interface StaggerListProps {
  children: ReactNode;
  /** Opt in to the animation. Off in Phase 0. */
  animate?: boolean;
  /** Milliseconds between each child. Small on purpose. */
  step?: number;
  /** Milliseconds before the first child. */
  delay?: number;
  /** Children beyond this render without a stagger. */
  max?: number;
  className?: string;
  /** Set when the list is a `ul`/`ol`; omit for a `div`. */
  as?: "div" | "ul" | "ol" | "li";
}

export const STAGGER_STEP_MS = 45;
export const STAGGER_DELAY_MS = 30;
export const STAGGER_MAX = 6;

export function StaggerList({
  children,
  animate = false,
  step = STAGGER_STEP_MS,
  delay = STAGGER_DELAY_MS,
  max = STAGGER_MAX,
  className,
  as: Tag = "div",
}: StaggerListProps) {
  const reduced = useReducedMotion();
  const items = Children.toArray(children);
  const staggers = animate && !reduced && items.length <= max;

  if (!staggers) {
    return (
      <Tag className={cn(className)} data-motion-state="instant">
        {items}
      </Tag>
    );
  }

  return (
    <Tag className={cn(className)} data-motion-state="staggering">
      {items.map((child, index) => (
        <li
          key={Children.count(child) > 0 ? undefined : index}
          className="motion-settle"
          style={
            {
              "--motion-stagger-delay": `${delay + index * step}ms`,
              animationDelay: `${delay + index * step}ms`,
            } as React.CSSProperties
          }
        >
          {child}
        </li>
      ))}
    </Tag>
  );
}
