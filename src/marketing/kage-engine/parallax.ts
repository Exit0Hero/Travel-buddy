/**
 * Foreground parallax planes.
 *
 * The cheapest depth cue there is: the same texture, repeated, moving faster
 * than the world. It is what stops a corridor from reading as a flat photograph
 * of a corridor, and it costs one draw call per layer.
 *
 * Depth is expressed as a multiplier on the camera's own motion, not as an
 * absolute offset, so a plane stays glued to the camera's parallax rate at every
 * FOV. Layers above ~2.4 shear against the near plane and start to look like a
 * bug, so the validator warns past that rather than letting a route author find
 * out in a screenshot.
 */
import * as THREE from "three";

import { paint } from "./textures";
import type { ForegroundLayer } from "./types";

export interface ParallaxHandles {
  group: THREE.Group;
  update: (cameraZ: number) => void;
  dispose: () => void;
}

export function buildParallax(
  layers: ReadonlyArray<ForegroundLayer>,
  baseZ: number,
): ParallaxHandles {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const planes: Array<{ mesh: THREE.Mesh; depth: number; base: number; scroll: boolean }> =
    [];

  for (const layer of layers) {
    if (layer.depth > 2.4) {
      // Deliberately a warning rather than a clamp: silently clamping a layer
      // somebody asked for is how you get an hour of confused debugging.
      console.warn(
        `[kage-engine] foreground depth ${layer.depth} is past 2.4 and will shear.`,
      );
    }
    const tex = track(new THREE.CanvasTexture(paint(layer.texture).canvas));
    tex.colorSpace = THREE.SRGBColorSpace;
    if (layer.texture.kind === "rain" || layer.texture.kind === "grain") {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    const geo = track(new THREE.PlaneGeometry(1, 1));
    const mat = track(
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: layer.opacity ?? 0.5,
        color: layer.tint ? new THREE.Color(layer.tint) : 0xffffff,
        depthWrite: false,
        blending:
          layer.texture.kind === "rain"
            ? THREE.AdditiveBlending
            : THREE.NormalBlending,
        fog: false,
      }),
    );

    const isCard = layer.texture.kind !== "rain" && layer.texture.kind !== "grain";
    for (let i = 0; i < layer.count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      if (isCard) {
        // A small lit window hanging past the camera. Sized and placed to read
        // as depth cue — anything larger stops being parallax and becomes an
        // obstruction.
        mesh.scale.set(1.5 + i * 0.22, 2.4 + i * 0.3, 1);
        mesh.position.set(
          (i % 2 === 0 ? 1 : -1) * (5.5 + (i % 3) * 1.6),
          2.4 + (i % 3) * 1.1,
          baseZ - i * 11,
        );
      } else {
        // A full-frame sheet, parented to the camera path.
        mesh.scale.set(58, 44, 1);
        mesh.position.set(0, 10, baseZ - i * 18);
      }
      group.add(mesh);
      planes.push({ mesh, depth: layer.depth, base: mesh.position.z, scroll: layer.scrollWithCamera ?? true });
    }
  }

  return {
    group,
    update(cameraZ) {
      for (const plane of planes) {
        if (!plane.scroll) continue;
        // Recycle ahead of the camera so a long route does not run out of
        // planes and reveal the end of the corridor.
        const span = 11;
        const rel = plane.base - cameraZ;
        plane.mesh.position.z = cameraZ + (((rel % span) + span) % span) - 4;
      }
    },
    dispose() {
      for (const item of disposables) item.dispose();
      group.clear();
    },
  };
}
