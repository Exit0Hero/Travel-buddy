/**
 * The world: a stylised night street, built from primitives.
 *
 * WHAT THIS IS NOT. It is not Kyoto. There is no temple, no torii, no lantern
 * gate and no shrine anywhere in this file, and the copy on every route that
 * uses it is Athiti's own. The reference implementation this borrows its
 * technique from is a Japanese temple corridor; the technique is what travels —
 * a camera flying down a corridor past thresholds that light up or turn red, a
 * city that resolves out of haze, pinned demand at the end. The subject is a
 * South Asian city street at 2am in the monsoon, because that is the situation
 * Athiti exists for.
 *
 * The corridor is a street. Buildings are extruded slabs on both sides with
 * painted facades, the ground is wet asphalt, signage hangs off the buildings
 * as coloured point lights, and haze sits in the middle distance. Everything is
 * instanced or shared so the whole world is a fixed, small number of draw calls
 * regardless of how many chapters a route has.
 */
import * as THREE from "three";

import { paint } from "./textures";
import type { EngineConfig } from "./types";
import { mulberry32 } from "./textures";

export interface WorldHandles {
  group: THREE.Group;
  /** Called every frame with normalised scroll 0..1 across the whole route. */
  update: (scroll: number, fogScale: number) => void;
  dispose: () => void;
  /** Fog density the rig sets per chapter. */
  fog: THREE.FogExp2;
  /** Every material that should receive bloom, for the post chain. */
  emissive: THREE.Object3D[];
}

const CORRIDOR_LENGTH = 260;
const STREET_WIDTH = 26;

function facadeTexture(seed: number, litRatio: number, hue: number): THREE.Texture {
  const { canvas } = paint({ kind: "facade", seed, litRatio, hue });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function buildWorld(config: EngineConfig): WorldHandles {
  const seed = config.seed ?? 20260926;
  const rnd = mulberry32(seed);
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  /* ---------------------------------------------------------------- scene */
  // FogExp2 holds no GPU resources and has no dispose(). Do not track it.
  const fog = new THREE.FogExp2(0x141a26, 0.0125);

  /* ------------------------------------------------------------- the road */
  const streetTex = track(
    new THREE.CanvasTexture(paint({ kind: "wetStreet", seed: seed + 1 }).canvas),
  );
  streetTex.colorSpace = THREE.SRGBColorSpace;
  streetTex.wrapS = THREE.RepeatWrapping;
  streetTex.wrapT = THREE.RepeatWrapping;
  streetTex.repeat.set(3, 26);
  const road = new THREE.Mesh(
    track(new THREE.PlaneGeometry(STREET_WIDTH, CORRIDOR_LENGTH)),
    track(
      new THREE.MeshStandardMaterial({
        map: streetTex,
        roughness: 0.16,
        metalness: 0.86,
        color: 0xc8d2e0,
      }),
    ),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = -CORRIDOR_LENGTH / 2 + 20;
  group.add(road);

  /* --------------------------------------------------------- the sky/haze */
  const hazeTex = track(
    new THREE.CanvasTexture(paint({ kind: "haze", seed: seed + 2 }).canvas),
  );
  hazeTex.colorSpace = THREE.SRGBColorSpace;
  const skyGeo = track(new THREE.SphereGeometry(300, 24, 16));
  const skyMat = track(
    new THREE.MeshBasicMaterial({
      map: hazeTex,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    }),
  );
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.z = -CORRIDOR_LENGTH / 2;
  group.add(sky);

  /* ---------------------------------------------------------- the street */
  // Sodium-vapour street lamps, alternating sides, plus a cool fill from the
  // sky. This is the light rig: warm, low, and from below, which is what makes
  // a wet street read as wet.
  const lampGeo = track(new THREE.SphereGeometry(0.55, 10, 8));
  const lampMat = track(
    new THREE.MeshBasicMaterial({ color: 0xfff0d0, fog: false }),
  );
  const lampCount = 26;
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lampCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < lampCount; i++) {
    const z = 14 - (i / lampCount) * CORRIDOR_LENGTH;
    const side = i % 2 === 0 ? 1 : -1;
    dummy.position.set(side * (STREET_WIDTH / 2 - 2.2), 7.4, z);
    dummy.updateMatrix();
    lamps.setMatrixAt(i, dummy.matrix);
  }
  lamps.instanceMatrix.needsUpdate = true;
  group.add(lamps);

  const sodium = track(new THREE.PointLight(0xffb469, 9, 60, 1.6));
  sodium.position.set(0, 8, 6);
  group.add(sodium);

  const fill = track(new THREE.HemisphereLight(0x6d8cb8, 0x14161c, 1.5));
  const ambient = track(new THREE.AmbientLight(0x2a3a52, 1.1));
  group.add(fill);
  group.add(ambient);

  /* --------------------------------------------------------- the buildings */
  // Three facade textures at different lit ratios, shared across every slab, so
  // the street reads as a mix of tenanted and empty buildings without a single
  // unique material.
  const facades: Array<{ tex: THREE.Texture; h: readonly [number, number] }> = [
    { tex: facadeTexture(seed + 11, 0.34, 36), h: [14, 30] },
    { tex: facadeTexture(seed + 12, 0.16, 28), h: [20, 44] },
    { tex: facadeTexture(seed + 13, 0.5, 44), h: [10, 22] },
  ];
  for (const f of facades) {
    f.tex.repeat.set(1, 2);
    track(f.tex);
  }

  const emissive: THREE.Object3D[] = [];
  const slabGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const slabMats = facades.map((f) =>
    track(
      new THREE.MeshStandardMaterial({
        map: f.tex,
        roughness: 0.86,
        metalness: 0.06,
      }),
    ),
  );

  const slabsPerSide = 15;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < slabsPerSide; i++) {
      const pick = Math.floor(rnd() * facades.length);
      const cfg = facades[pick];
      if (!cfg) continue;
      const h = cfg.h[0] + rnd() * (cfg.h[1] - cfg.h[0]);
      const w = 9 + rnd() * 12;
      const d = 10 + rnd() * 8;
      const mat = slabMats[pick];
      if (!mat) continue;
      const mesh = new THREE.Mesh(slabGeo, mat);
      mesh.scale.set(w, h, d);
      mesh.position.set(
        side * (STREET_WIDTH / 2 + w / 2 - 0.6),
        h / 2,
        16 - (i / slabsPerSide) * CORRIDOR_LENGTH - rnd() * 4,
      );
      group.add(mesh);
    }
  }

  /* ------------------------------------------------------------- signage */
  // Signage is the only saturated colour in the world, which is what stops a
  // night street reading as a grey box. Each sign is a plane plus a real point
  // light, so it lights the wall behind it.
  const signTex = track(
    new THREE.CanvasTexture(paint({ kind: "signage", seed: seed + 21, hue: 8 }).canvas),
  );
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signGeo = track(new THREE.PlaneGeometry(5, 2.5));
  const signCount = 22;
  const signMat = track(
    new THREE.MeshBasicMaterial({
      map: signTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  const signs = new THREE.InstancedMesh(signGeo, signMat, signCount);
  const signLights: THREE.PointLight[] = [];
  for (let i = 0; i < signCount; i++) {
    const z = 12 - (i / signCount) * CORRIDOR_LENGTH + rnd() * 6;
    const side = rnd() < 0.5 ? 1 : -1;
    const x = side * (STREET_WIDTH / 2 + 0.4);
    const y = 3.6 + rnd() * 11;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
    dummy.scale.setScalar(1.1 + rnd() * 1.2);
    dummy.updateMatrix();
    signs.setMatrixAt(i, dummy.matrix);

    // A matching light, but only every third sign gets one. Twenty-two real
    // point lights would blow the per-fragment light budget on a phone for a
    // difference nobody can see.
    if (i % 3 === 0) {
      const SIGN_HUES = [8, 28, 190, 320] as const;
      const hue = SIGN_HUES[i % SIGN_HUES.length] ?? 28;
      const light = new THREE.PointLight(new THREE.Color().setHSL(hue / 360, 0.8, 0.6), 5, 34, 1.6);
      light.position.set(x - side * 1.6, y, z);
      group.add(light);
      signLights.push(light);
    }
  }
  signs.instanceMatrix.needsUpdate = true;
  group.add(signs);
  emissive.push(signs, lamps);

  /* ----------------------------------------------------------------- rain */
  // Three parallax sheets rather than a particle system. A few thousand points
  // costs real frame time on a mid-range phone; three textured planes cost
  // three draw calls and read the same at this camera speed.
  const rainTex = track(
    new THREE.CanvasTexture(paint({ kind: "rain", seed: seed + 31 }).canvas),
  );
  rainTex.colorSpace = THREE.SRGBColorSpace;
  rainTex.wrapS = THREE.RepeatWrapping;
  rainTex.wrapT = THREE.RepeatWrapping;
  const rainSheets: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    rainTex.clone();
    const tex = track(rainTex.clone());
    tex.repeat.set(3 + i, 3 + i);
    tex.needsUpdate = true;
    const mesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(70, 60)),
      track(
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.34 - i * 0.08,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    mesh.position.set(0, 14, -i * 26);
    rainSheets.push(mesh);
    group.add(mesh);
  }

  /* ------------------------------------------------------------------ API */
  return {
    group,
    fog,
    emissive,
    update(scroll, fogScale) {
      // Rain drifts downward on its own clock and slides past as the camera
      // moves, so the two motions do not read as one.
      const t = performance.now() * 0.001;
      for (let i = 0; i < rainSheets.length; i++) {
        const sheet = rainSheets[i];
        if (!sheet) continue;
        const mat = sheet.material as THREE.MeshBasicMaterial;
        if (mat.map) {
          mat.map.offset.y = (t * (0.22 + i * 0.1) + scroll * 0.6) % 1;
        }
        sheet.position.z = -i * 26 + ((t * (1.4 + i * 0.7)) % 60);
      }

      // Fog breathes with the chapter, so a chapter can ask for a thicker
      // atmosphere and get one without the rig knowing anything about it.
      fog.density = 0.0165 * fogScale;

      // Lamps flicker very slightly. A city where every light is perfectly
      // steady looks like a render.
      const flick = 1 + Math.sin(t * 7.3) * 0.02 + Math.sin(t * 2.1) * 0.015;
      sodium.intensity = 9 * flick;
      for (let i = 0; i < signLights.length; i++) {
        const light = signLights[i];
        if (!light) continue;
        light.intensity = 5 * (1 + Math.sin(t * (3 + i * 0.7)) * 0.06);
      }
    },
    dispose() {
      for (const item of disposables) item.dispose();
      group.clear();
    },
  };
}
