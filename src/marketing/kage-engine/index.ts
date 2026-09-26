/**
 * The kage-engine. One scroll rig, three routes.
 *
 * A route supplies an `EngineConfig` — chapters, waypoints, gates, pins — and
 * gets the camera curve, the procedural city, the bloom, the grain, the
 * parallax and the nav rail for free. Nothing in here knows what a chapter
 * says; the copy is data, and the engine will refuse a config that would make
 * the page lie.
 *
 * Public surface:
 *   KageEngine      the React component a route renders
 *   EngineConfig    the config contract
 *   validateConfig  the honesty check
 *   scale           the shared type/colour/motion scale (also read by EmptyState)
 */
export { KageEngine, type KageEngineProps } from "./KageEngine";
export {
  validateConfig,
  EngineConfigError,
  gateZ,
  type EngineConfig,
  type Chapter,
  type Waypoint,
  type ThresholdGate,
  type ForegroundLayer,
  type Pin,
  type TextureRecipe,
} from "./types";
export { CINEMATIC_SCALE, CSS_VARS, scaleCss } from "./scale";
