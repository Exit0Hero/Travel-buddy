"use client";

import type { ReactNode } from "react";

import { cn } from "../../cn";
import { useReducedMotion } from "./useReducedMotion";

/**
 * CrossFade — swap one thing for another without a hard cut.
 *
 * PHASE 0 SCOPE. This is the minimal version: correct API, correct reduced
 * motion behaviour, and deliberately NO animation yet. The plan's Phase 0 gate
 * is "nothing visually changes", so wiring the transition in now would fail its
 * own gate. `animate` defaults to `false` for the same reason — a component
 * that animates by default is a component that has already shipped motion
 * nobody reviewed.
 *
 * WHERE IT IS MEANT TO BE USED (Phase 2). The replanner's itinerary diff, and
 * only there: a row that did not change must NOT animate, because a diff that
 * moves everything tells the traveller nothing about what changed. The
 * `changed` prop is the whole contract — pass the real diff from the contract's
 * `ReplanResult.swaps`, do not pass `true` for a whole list.
 *
 * WHY NOT A CSS-ONLY FADE. Because a cross-fade has a correctness requirement
 * that CSS cannot meet: both children must be mounted briefly and the outgoing
 * one must not be focusable, or a keyboard user tabs into something that is
 * visually gone. That needs React, and it needs to know when the exit is over.
 *
 * REDUCED MOTION. Returns the incoming child immediately, mounts only one
 * child, and never transitions. No timer, no state churn, no layout thrash —
 * which is the entire reason the plan put a hook in Phase 0: a cross-fade
 * implemented with `setTimeout` is a cross-fade that animates for 240ms of
 * reduced-motion user's time, every time.
 */
export interface CrossFadeProps {
  /** The outgoing content. */
  children: ReactNode;
  /** The incoming content. */
  next: ReactNode;
  /**
   * Whether this particular swap is a real change. `false` renders `children`
   * untouched and does not transition — this is the diff-scoped behaviour the
   * replanner depends on.
   */
  changed: boolean;
  /**
   * Opt in to the animation. Off in Phase 0.
   *
   * `onSettled` deliberately does not exist yet. In Phase 0 nothing settles, so
   * a callback prop would be one that silently never fires — the worst kind of
   * API, because the caller cannot tell the difference between "has not
   * happened" and "will not happen". It returns in Phase 1 alongside the
   * animation that can actually fire it.
   */
  animate?: boolean;
  className?: string;
}

export function CrossFade({
  children,
  next,
  changed,
  animate = false,
  className,
}: CrossFadeProps) {
  const reduced = useReducedMotion();

  // Reduced motion, or nothing changed, or animation not yet enabled: there is
  // exactly one child and no transition. The `!animate` term is what keeps this
  // file visually inert in Phase 0.
  if (reduced || !changed || !animate) {
    return (
      <div
        className={cn("motion-crossfade", className)}
        data-motion-state="instant"
      >
        {changed && !reduced && animate ? next : children}
      </div>
    );
  }

  // Reachable once Phase 1 turns `animate` on. Both children are mounted and
  // the outgoing one is `inert`, so it cannot receive focus while it is fading.
  return (
    <div
      className={cn("motion-crossfade", className)}
      data-motion-state="crossfading"
    >
      <div inert className="motion-fade-out" aria-hidden="true">
        {children}
      </div>
      <div className="motion-fade-in">{next}</div>
    </div>
  );
}
