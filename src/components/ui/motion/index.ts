/**
 * Shared motion primitives. Phase 0.
 *
 * `tokens.css` owns the VALUES. `motion.css` owns the KEYFRAMES. This folder
 * owns the COMPONENTS, and `useReducedMotion` is the single place the
 * reduced-motion question is asked.
 *
 * All three components are deliberately inert in Phase 0 — correct props,
 * correct reduced-motion behaviour, `animate` off by default — so landing this
 * phase changes nothing a person can see. Phases 1 and 2 turn them on against
 * primitives and feature surfaces respectively.
 */
export {
  CrossFade,
  type CrossFadeProps,
} from "./CrossFade";
export {
  StaggerList,
  STAGGER_STEP_MS,
  STAGGER_DELAY_MS,
  STAGGER_MAX,
  type StaggerListProps,
} from "./StaggerList";
export {
  RouteTransition,
  ROUTE_TRANSITION_MS,
  type RouteTransitionProps,
} from "./RouteTransition";
export { useReducedMotion } from "./useReducedMotion";
