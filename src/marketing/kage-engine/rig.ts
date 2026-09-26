/**
 * The camera rig. One scroll position drives everything.
 *
 * THE MODEL. A route is a list of chapters; each chapter has one waypoint. The
 * rig maps scroll progress onto a continuous position along that list, then
 * smooths it. There is no scroll-jacking, no `preventDefault`, and no hijacked
 * wheel event: the page scrolls natively and the rig reads it. That is a
 * deliberate accessibility decision, and it is why `reduced` below short-
 * circuits the whole thing rather than trying to make a still camera feel like
 * a moving one.
 *
 * The smoothing is a frame-rate-independent exponential approach, not a lerp
 * toward the target. A naive `lerp(current, target, 0.1)` moves at a different
 * speed on a 60 Hz and a 144 Hz display, which is the single most common way a
 * scroll scene ends up feeling wrong on somebody's machine.
 */
import * as THREE from "three";

import type { EngineConfig, Waypoint } from "./types";

export interface Rig {
  camera: THREE.PerspectiveCamera;
  /** Feed normalised scroll, 0..1. */
  update: (scroll: number, dt: number) => void;
  /** Per-chapter weights, for the world and post chain to read. */
  chapterMix: number[];
  /** Where the camera currently is, for the nav rail. */
  activeIndex: () => number;
  dispose: () => void;
}

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export function createRig(
  config: EngineConfig,
  aspect: number,
  reduced: boolean,
): Rig {
  const waypoints: Waypoint[] = config.chapters.map((c) => c.waypoint);
  const first = waypoints[0];
  if (!first) throw new Error("kage-engine: no waypoints");

  const camera = new THREE.PerspectiveCamera(
    first.fov,
    aspect,
    0.1,
    600,
  );
  camera.position.set(...first.position);
  camera.lookAt(new THREE.Vector3(...first.target));

  const chapterMix = new Array<number>(waypoints.length).fill(0);
  const targetPos = new THREE.Vector3(...first.position);
  const targetLook = new THREE.Vector3(...first.target);

  if (reduced) {
    /*
      REDUCED MOTION. Not a slower camera — no camera at all. The rig reports
      the chapter nearest the top of the viewport and holds one framing, and the
      page's own text carries the content. A still camera that pans on scroll is
      still motion; this removes the motion and keeps the words.
    */
    let settled = false;
    return {
      camera,
      chapterMix,
      update(scroll) {
        const idx = Math.min(
          waypoints.length - 1,
          Math.max(0, Math.round(scroll * (waypoints.length - 1))),
        );
        const wp = waypoints[idx];
        if (!wp) return;
        if (!settled) {
          camera.position.set(...wp.position);
          camera.lookAt(new THREE.Vector3(...wp.target));
          settled = true;
        }
        for (let i = 0; i < chapterMix.length; i++) {
          chapterMix[i] = i === idx ? 1 : 0;
        }
      },
      activeIndex: () =>
        Math.min(
          waypoints.length - 1,
          Math.max(0, Math.round(0 * (waypoints.length - 1))),
        ),
      dispose() {
        camera.clear();
      },
    };
  }

  const lookCurrent = new THREE.Vector3(...first.target);
  let smoothed = 0;
  let currentFov = first.fov;
  let currentRoll = first.roll ?? 0;

  return {
    camera,
    chapterMix,
    update(scroll, dt) {
      // Where along the chapter list are we, in continuous chapter units.
      const span = Math.max(1, waypoints.length - 1);
      const pos = Math.min(span, Math.max(0, scroll * span));
      const i0 = Math.min(waypoints.length - 1, Math.floor(pos));
      const i1 = Math.min(waypoints.length - 1, i0 + 1);
      const t = easeInOut(pos - i0);
      const a = waypoints[i0];
      const b = waypoints[i1];
      if (!a || !b) return;

      targetPos.set(
        a.position[0] + (b.position[0] - a.position[0]) * t,
        a.position[1] + (b.position[1] - a.position[1]) * t,
        a.position[2] + (b.position[2] - a.position[2]) * t,
      );
      targetLook.set(
        a.target[0] + (b.target[0] - a.target[0]) * t,
        a.target[1] + (b.target[1] - a.target[1]) * t,
        a.target[2] + (b.target[2] - a.target[2]) * t,
      );
      const wantFov = a.fov + (b.fov - a.fov) * t;
      const wantRoll = (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * t;

      /*
        Frame-rate-independent exponential smoothing. `1 - exp(-k * dt)` is the
        correct weight for "close a fraction of the remaining gap every second";
        using a constant per-frame fraction instead makes the move speed depend
        on the monitor.
      */
      const k = 1 - Math.exp(-6.5 * Math.min(dt, 0.1));
      smoothed += (scroll - smoothed) * (1 - Math.exp(-9 * Math.min(dt, 0.1)));

      camera.position.lerp(targetPos, k);
      lookCurrent.lerp(targetLook, k);
      camera.lookAt(lookCurrent);

      currentFov += (wantFov - currentFov) * k;
      if (Math.abs(camera.fov - currentFov) > 0.01) {
        camera.fov = currentFov;
        camera.updateProjectionMatrix();
      }
      currentRoll += (wantRoll - currentRoll) * k;
      camera.rotation.z = currentRoll;

      for (let i = 0; i < chapterMix.length; i++) {
        const d = Math.abs(i - pos);
        chapterMix[i] = Math.max(0, 1 - d);
      }
    },
    activeIndex() {
      const span = Math.max(1, waypoints.length - 1);
      return Math.min(
        waypoints.length - 1,
        Math.max(0, Math.round(smoothed * span)),
      );
    },
    dispose() {
      camera.clear();
    },
  };
}
