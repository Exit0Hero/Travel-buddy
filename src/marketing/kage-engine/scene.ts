/**
 * Kage's mechanics, extracted from the WebGL loop.
 *
 * WHY THIS FILE EXISTS. The three cinematic routes are driven by a single
 * scroll position, and that scroll position is the input the engine's frame
 * loop is reading anyway. But the values it derives from scroll — which chapter
 * is active, which is retiring, how far through a band the reader is, how a
 * foreground layer parallax rate maps to depth — are not WebGL-specific. A gate
 * brightening as the camera approaches it, the nav rail's active tick, the
 * cross-fade between two foreground chapters, the per-layer parallax multiplier:
 * these are the *mechanics*, and they have to be the same number whether the
 * consumer is a Three.js material in `rig.ts`/`parallax.ts` or a DOM element
 * in a future reveal surface.
 *
 * So the mechanics live here as pure functions and the engine imports them.
 * There is exactly one definition of each; if `rig.ts` and a DOM consumer ever
 * disagree, it is a compile error in this file rather than a drift between two
 * copies of the same formula.
 *
 * CONVENTION. Every function takes the normalised scroll fraction `scroll`
 * (0..1 over the whole narrative, exactly as the engine feeds `rig.update`),
 * not a raw `scrollY`. The raw-Y-to-fraction step is viewport- and
 * content-height-dependent, which is layout, not mechanics. Keeping it out of
 * here means these functions are unit-testable without jsdom and stay correct
 * if the chapter band height ever stops being `100dvh`.
 *
 * REDUCED MOTION. These functions are pure transforms of a number; they do no
 * timing, no animation, no DOM. The reduced-motion contract is applied by the
 * *consumer*: under reduced motion the rig reports the nearest chapter (see
 * `rig.ts`'s reduced-motion branch) and the DOM consumers are expected to read
 * `motion.css`'s reduced-motion block, which collapses durations to zero and
 * forces every element to `opacity:1; transform:none`. So the mechanics are
 * the same in both modes — only the timing wrapper changes.
 */

/**
 * The chapter mix — one weight per chapter, summing to ~1 at every scroll.
 *
 * This is the active/retiring cross-fade. Chapter `i` is at full weight (1)
 * when the scroll fraction sits exactly on it, and falls off linearly to its
 * neighbours, so chapter `i` and chapter `i+1` are both partially lit over the
 * span between their waypoints. `rig.ts` reads this to blend fog, bloom and
 * fog density, and a DOM consumer reads it to drive an opacity transform on a
 * chapter's foreground layer. Same numbers either way.
 *
 * Matches `rig.ts` `chapterMix[i] = max(0, 1 - |i - pos|)` exactly; `pos` is
 * `scroll * (n - 1)` and `i` ranges over chapter indices.
 */
export function chapterMix(scroll: number, n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [1];
  const span = n - 1;
  const pos = Math.min(span, Math.max(0, scroll * span));
  const weights = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    weights[i] = Math.max(0, 1 - Math.abs(i - pos));
  }
  return weights;
}

/**
 * The index of the chapter nearest the current scroll, as the rig reports it.
 *
 * `rig.activeIndex()` rounds the *smoothed* scroll, but smoothing is a property
 * of the frame loop, not of the mechanics. This takes the scroll the caller has
 * already smoothed (the engine passes its smoothed value in), so the same
 * function serves both "where is the camera really" and "where did the reader
 * actually stop on a key".
 */
export function activeIndex(scroll: number, n: number, smoothed = scroll): number {
  if (n <= 0) return 0;
  if (n === 1) return 0;
  const span = n - 1;
  const src = Math.min(span, Math.max(0, smoothed * span));
  return Math.min(n - 1, Math.max(0, Math.round(src)));
}

/**
 * Per-chapter progress within its own viewport band.
 *
 * Each chapter occupies a full viewport band (100dvh), so chapter `i`'s band
 * runs from scroll fraction `i/n .. (i+1)/n`. This returns, for every chapter,
 * a `0..1` value for how far *into its own band* the reader has scrolled — the
 * number a rail tick or a reveal needs rather than the global fraction, and
 * crucially derived from scroll position, not from fixed 25%/50%/75%
 * breakpoints.
 *
 * Returns `{ active, retiring }`:
 *  - `active` grows 0→1 as the reader enters the band, hits 1 at the centre,
 *    then falls 1→0 as they leave — a triangle, so a tick at the centre reads
 *    "complete" and the fade-in/out happens at the band edges.
 *  - `retiring` is `1 - active`: the outgoing weight of a chapter as the next
 *    one takes over, so a layer can scale its exit over the same band the next
 *    one scales its entrance in.
 */
export interface ChapterBandProgress {
  active: number;
  retiring: number;
}
export function chapterBandProgress(scroll: number, n: number): ChapterBandProgress[] {
  if (n <= 0) return [];
  const span = n - 1;
  const pos = Math.min(span, Math.max(0, scroll * span));
  const out: ChapterBandProgress[] = new Array(n);
  for (let i = 0; i < n; i++) {
    // Distance, in chapter units, from this chapter's centre to the cursor.
    const d = Math.abs(i - pos);
    const active = Math.max(0, Math.min(1, 1 - d));
    out[i] = { active, retiring: 1 - active };
  }
  return out;
}

/**
 * The foreground parallax multiplier for one layer.
 *
 * The engine moves a foreground plane faster than the world by multiplying the
 * camera's motion by `layer.depth`. Depth sits in [1, ~2.4]; past 2.4 a layer
 * shears against the near plane and reads as a bug, so `parallax.ts` warns.
 * This is the same multiplier, exported so a DOM parallax (translate based on
 * scroll * depth) and the WebGL parallax move at the same rate and in the same
 * direction.
 */
export function foregroundMultiplier(depth: number): number {
  return depth;
}

/**
 * Gate "near" progression — how lit a gate is as the camera reaches it.
 *
 * Matches the frame loop: `near = max(0, 1 - dist/34)`, where `dist` is the
 * absolute difference between the gate's world-Z and the camera's Z. The gate
 * is fully lit at the gate and falls off to nothing 34 units away, which is why
 * a gate only begins to read as an event once the camera is genuinely passing
 * it rather than merely approaching. A DOM gate can drive the same `near` value
 * onto opacity/brightness so the WebGL gate and the DOM gate brighten together.
 */
export function gateNearProgression(cameraZ: number, gateZ: number): number {
  const dist = Math.abs(gateZ - cameraZ);
  return Math.max(0, 1 - dist / 34);
}

/**
 * Pin pulse — the subtle breathing scale applied to every pin sprite.
 *
 * Matches `pin.scale.setScalar(1 + sin(now*0.003 + pin.x) * 0.16)`. Extracted
 * so a DOM pin can apply the same rhythm and stay in lockstep with the WebGL
 * pins rather than drifting into its own pulse.
 */
export function pinPulse(timeMs: number, pinX: number): number {
  return 1 + Math.sin((timeMs * 0.001) * 3 + pinX) * 0.16;
}
