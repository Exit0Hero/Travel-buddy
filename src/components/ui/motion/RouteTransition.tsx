"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { cn } from "../../cn";
import { useReducedMotion } from "./useReducedMotion";

/**
 * RouteTransition — a cross-route settle.
 *
 * PHASE 0 SCOPE. Minimal version, animation off by default, and NOT yet wired
 * into the root layout. Phase 3 mounts it. See `CrossFade` for why the default
 * is off.
 *
 * THE ACTUAL PROBLEM THIS SOLVES, so it is not built speculatively. Next.js
 * App Router soft-navigates: the outgoing page unmounts and the incoming one
 * mounts in the same frame, so a route change is currently a hard cut. On a
 * product where one route is a cinematic band and the next is a daylight
 * instrument, that cut is a flash of the wrong background — the single most
 * jarring thing in the app, and worse after Phase 3 than before it.
 *
 * WHY A PATHNAME KEY RATHER THAN A `key` PROP ON A LAYOUT. Remounting the whole
 * tree on every navigation would throw away scroll position, re-run every
 * effect, and re-request the map. This component only paints a short-lived
 * overlay and reports a settle; it never owns the children.
 *
 * WHY IT IS AN OVERLAY AND NOT A WRAPPER. A wrapper has to decide what to render
 * during the transition, and any answer other than "both, with one hidden"
 * either blanks the page or flashes the new route a frame early. An overlay
 * cannot: the outgoing content stays mounted and visible underneath, and the
 * overlay only ever sits on top of it.
 *
 * REDUCED MOTION. No overlay, no class, no timer, no effect beyond a pathname
 * read. The `useEffect` that watches the pathname still runs — it has to, it is
 * what detects the navigation — but it performs no work. The pathname is read
 * for the dependency array and nothing else.
 */
export interface RouteTransitionProps {
  children: ReactNode;
  /** Opt in to the animation. Off in Phase 0. */
  animate?: boolean;
  /** Milliseconds the overlay takes. */
  duration?: number;
  className?: string;
}

export const ROUTE_TRANSITION_MS = 260;

export function RouteTransition({
  children,
  animate = false,
  duration = ROUTE_TRANSITION_MS,
  className,
}: RouteTransitionProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    // Phase 1 adds the overlay here. Deliberately empty for now: returning
    // early keeps the effect honest about doing nothing rather than about
    // doing something invisible.
    if (reduced || !animate) return;
  }, [pathname, reduced, animate, duration]);

  return (
    <div className={cn("relative", className)} data-route={pathname}>
      {children}
    </div>
  );
}
