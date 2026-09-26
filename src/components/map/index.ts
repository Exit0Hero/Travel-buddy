/**
 * Barrel for the map components.
 *
 * The map is never the only path to a place. DESIGN_SYSTEM §5: it is not
 * keyboard-navigable, and pretending otherwise is worse than not shipping it,
 * so the list view is the first-class alternative and the canvas is
 * `aria-hidden`. Every action available on a marker is also available on a card.
 */

export { MapCanvas, dedupeFeatures } from "./MapCanvas";
export type { MapCanvasProps } from "./MapCanvas";

export {
  ClusterLayer,
  RouteLine,
  CardMapCoupling,
  CLUSTERED_SOURCE,
  HIT_SOURCE,
  ROUTE_SOURCE,
} from "./ClusterLayer";
export type {
  ClusterLayerProps,
  RouteLineProps,
  CardMapCouplingProps,
} from "./ClusterLayer";
