"use client";

import { useEffect, useState } from "react";

/**
 * The single reduced-motion hook.
 *
 * WHY ONE HOOK AND NOT SEVERAL `matchMedia` CALLS. By Phase 0 the codebase had
 * three places asking this question independently — the marketing engine, the
 * theme script and the accessibility controls — and they could disagree. The
 * engine honoured the OS preference and ignored the in-app toggle, so a user who
 * had explicitly turned motion off in the app still got a scroll-driven camera.
 * Two sources of truth for one preference is not a preference, it is a bug with
 * a settings screen.
 *
 * So this hook is the only place the question is asked, and it merges BOTH
 * sources:
 *
 *   1. the OS-level `prefers-reduced-motion` media query, and
 *   2. `data-motion="reduced"` on the document root, which
 *      `ThemeScript` and `AccessibilityControls` write from the in-app toggle.
 *
 * Either one asking for less motion wins. That is the safe direction to fail
 * in: if the two sources ever desynchronise — a toggle set before hydration, a
 * stale attribute, a browser that mishandles the query — the user gets less
 * motion rather than more.
 *
 * WHAT IT IS FOR. CSS handles the ordinary case: `tokens.css` collapses
 * durations, and `motion.css` gates every keyframe behind
 * `prefers-reduced-motion: no-preference`. This hook exists for the cases CSS
 * cannot express, which are all about skipping WORK rather than skipping an
 * animation:
 *
 *   - a stream that would otherwise enqueue a timer per line;
 *   - a `requestAnimationFrame` loop whose only output is motion;
 *   - anything that would measure an element's position mid-transition.
 *
 * RULE FOR CALLERS: this hook must never gate whether CONTENT RENDERS. It may
 * gate whether content is animated or how it is computed. Gating rendering on it
 * is how a "reduced motion" path turns into a blank page.
 */

/** Read the current value synchronously, for the first render. */
function read(): boolean {
  if (typeof window === "undefined") return false;
  const osPrefers = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const appPrefers = document.documentElement.getAttribute("data-motion") === "reduced";
  return osPrefers || appPrefers;
}

export function useReducedMotion(): boolean {
  // Start from the real value on the client, `false` on the server, so the
  // server and the first client render agree and hydration does not mismatch.
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const sync = () => setReduced(read());
    sync();

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    // `addEventListener` on a MediaQueryList is the modern form; `addListener`
    // is the deprecated one and is kept only as a fallback for older Safari,
    // which is the same branch the engine's own hook took.
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    const legacy = mq as MediaQueryList & {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };
    legacy.addListener?.(sync);
    return () => legacy.removeListener?.(sync);
  }, []);

  /*
    The in-app toggle mutates an attribute on the root element. There is no
    event for that, so it is observed. A MutationObserver on `data-motion` alone
    is used rather than a whole-subtree observer, because the toggle is the
    only writer and watching everything would fire on every unrelated attribute
    change in the app.
  */
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(syncOnMotionAttr);
    observer.observe(root, { attributes: true, attributeFilter: ["data-motion"] });
    return () => observer.disconnect();

    function syncOnMotionAttr() {
      setReduced(read());
    }
  }, []);

  return reduced;
}
