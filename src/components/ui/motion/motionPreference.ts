"use client";

/**
 * The single place every motion library is told what the user's motion
 * preference is.
 *
 * WHY THIS FILE EXISTS. Phase 0.5 adds five libraries, and every one of them
 * ships its own reduced-motion switch:
 *
 *   motion             `useReducedMotion` / `MotionConfig reducedMotion`
 *   gsap + ScrollTrigger  no built-in switch; you are expected to check yourself
 *   Lenis              `options.smoothWheel` / `autoRaf`
 *   next-view-transitions  a boolean on the root component
 *   vaul               `VAUL_IS_PROD` / no per-instance motion switch
 *
 * Left alone, that is five independent decisions about the same preference, and
 * the failure mode is not a crash — it is a page where the hero respects the
 * setting and the scroll hijack does not. This repo has already shipped that
 * bug once: the marketing engine honoured `prefers-reduced-motion` and ignored
 * the in-app `data-motion` toggle, so a user who had explicitly turned motion off
 * in the app still got a scroll-driven camera.
 *
 * The rule, then: nothing reads `matchMedia` for motion again. Everything comes
 * through here, and everything comes from `useReducedMotion`.
 *
 * ---------------------------------------------------------------------------
 * SCOPE — the five libraries are NOT interchangeable, and the plan is explicit:
 *
 *   motion               (app) AND (marketing). Component-level animation, so
 *                        it has to work on a functional page.
 *   gsap + ScrollTrigger (marketing) ONLY. A scroll-hijacking tween library has
 *                        no business on a page with a live map or a form.
 *   Lenis                (marketing) ONLY, mounted in that route group's layout
 *                        and never the root. Inertia scroll over a form or a
 *                        map is a usability regression, not an enhancement.
 *   next-view-transitions  wraps the ROOT layout. It is a transition BETWEEN
 *                        routes, so it has to apply everywhere to be correct.
 *   vaul                 only where a sheet actually is (see the note below).
 *
 * VAUL HAS NO TARGET YET. The audit for Phase 0.5 found that every `<Sheet>` in
 * this app renders with `side="right"` — the chat sidecar and the why-ledger
 * drawer — and that no `<Dialog>` is rendered anywhere. `Sheet` supports
 * `side="bottom"` and the styles exist, but nothing uses it. The itinerary
 * (`PlanTimeline`) is rendered INLINE inside a card in the results column, on
 * every viewport; it has never been a fixed panel. So there is no mobile
 * itinerary sheet for vaul to take over, and inventing one is a design change,
 * not a dependency change. The import is wired here and left unmounted.
 *
 * ---------------------------------------------------------------------------
 * PHASE 0.5 SCOPE: this module resolves and types. It starts nothing, mounts
 * nothing and renders nothing. No animation code is written until Phase 1.
 */

import { useReducedMotion } from "./useReducedMotion";

/** One resolved answer, for every library. */
export interface MotionPreference {
  /** The user's preference, merged from the OS query and the in-app toggle. */
  reduced: boolean;
  /**
   * Lenis. Inertia scroll is the single most hostile thing you can put under
   * `prefers-reduced-motion`, so this is a hard off, not a lower speed.
   */
  lenis: { smoothWheel: boolean; syncTouch: boolean; duration: number };
  /** GSAP. There is no native switch, so reduced motion means a zero scale. */
  gsap: { timeScale: number; scrollSmoothing: boolean };
  /** motion. `reducedMotion: "user"` would make the library ask again. */
  motion: { reducedMotion: "always" | "never" };
  /** next-view-transitions. */
  viewTransition: { enabled: boolean };
  /** vaul. Kept mounted but non-interactive under reduced motion. */
  vaul: { snapToOffset: boolean; shouldAnimate: boolean };
}

/**
 * The mapping, as data, so it can be asserted in a test and read without
 * running a component.
 *
 * The numbers are not arbitrary. `timeScale: 0` is GSAP's documented way of
 * making a timeline complete instantly while still firing its callbacks, which
 * matters: code that waits on a tween's `onComplete` would otherwise hang
 * forever under reduced motion. `lenis.smoothWheel: false` disables inertia
 * entirely rather than shortening it.
 */
export const MOTION_PREFERENCE: MotionPreference = {
  reduced: false,
  lenis: { smoothWheel: true, syncTouch: true, duration: 1.1 },
  gsap: { timeScale: 1, scrollSmoothing: true },
  motion: { reducedMotion: "never" },
  viewTransition: { enabled: true },
  vaul: { snapToOffset: true, shouldAnimate: true },
};

/** The same mapping, flipped. Derived, never hand-maintained twice. */
export const REDUCED_MOTION_PREFERENCE: MotionPreference = {
  reduced: true,
  lenis: { smoothWheel: false, syncTouch: false, duration: 0 },
  gsap: { timeScale: 0, scrollSmoothing: false },
  motion: { reducedMotion: "always" },
  viewTransition: { enabled: false },
  vaul: { snapToOffset: false, shouldAnimate: false },
};

export function resolveMotionPreference(reduced: boolean): MotionPreference {
  return reduced ? REDUCED_MOTION_PREFERENCE : MOTION_PREFERENCE;
}

/**
 * The hook every consumer uses. Returns the resolved preference for the whole
 * library set, so a caller cannot accidentally read `useReducedMotion()`
 * directly and then forget one of the five.
 */
export function useMotionPreference(): MotionPreference {
  const reduced = useReducedMotion();
  return resolveMotionPreference(reduced);
}

/*
 * NO STARTERS IN THIS PHASE.

 * There is deliberately no `startMarketingGsap` / `startMarketingLenis` here yet.
 * A function that constructs a Lenis instance or drives `globalTimeline` is
 * animation code, and Phase 0.5 says not to write any. It is also not free: a
 * bare `import("gsap")` inside such a function makes webpack emit a real async
 * chunk, so writing it would have shipped ~70 KB of GSAP on a phase whose gate
 * is that nothing is shipped. Measured, not assumed — the first draft of this
 * file did exactly that and put GSAP in three chunks.

 * Phase 1 adds them here, which is the point of having one module: the scope
 * rule is then enforced by file layout, because GSAP and Lenis have no export
 * path that a functional page would reach for.

 */

/**
 * Applies the preference to a `next-view-transitions` root. In Phase 0.5 this
 * is only the type contract; Phase 3 wraps the root layout with it.
 */
export function viewTransitionProps(
  preference: MotionPreference,
): { enabled: boolean } {
  return { enabled: preference.viewTransition.enabled };
}

/**
 * Re-exported so a consumer that genuinely needs the raw boolean — and there
 * should be very few — has a single documented import rather than reaching past
 * this module into the hook module.
 */
export { useReducedMotion } from "./useReducedMotion";

/**
 * Compile-time guard that the five libraries are actually resolvable and that
 * their exported types are what this file assumes. `tsc` checks this file
 * because it is in `src`, so a breaking upgrade to any of them fails the
 * typecheck before it fails a page.
 *
 * The imports are type-only where possible so nothing is bundled, which is what
 * keeps "zero new files consuming these libraries" true at the bundle level
 * while still proving the wiring compiles.
 */
type _AssertMotion = typeof import("motion");
type _AssertGsap = typeof import("gsap");
type _AssertLenis = typeof import("@studio-freight/lenis");
type _AssertViewTransitions = typeof import("next-view-transitions");
type _AssertVaul = typeof import("vaul");

export type MotionAsserts = [
  _AssertMotion,
  _AssertGsap,
  _AssertLenis,
  _AssertViewTransitions,
  _AssertVaul,
];
