/**
 * Post-processing: render, then bloom, then grain and a vignette.
 *
 * WHY THESE THREE AND NOT MORE. A scroll scene lives or dies on the gap between
 * "clean" and "crushed". Bloom over threshold is what makes a light source read
 * as a light source rather than a bright polygon — without it the signage is
 * just coloured paper. Grain and a vignette are what stop the large dark areas
 * from banding on an 8-bit panel, which on a near-black scene is extremely
 * visible on a good monitor.
 *
 * What is deliberately absent: depth of field (it costs a pass and reads as
 * mush at this camera speed), chromatic aberration (a filter, not a
 * simulation), and motion blur (expensive, and it fights legibility, which is
 * the one thing this treatment must not do).
 *
 * The passes come from `three/examples/jsm`, which ships inside the `three`
 * package. So the whole chain is real post-processing with no extra dependency.
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import { paint } from "./textures";

/**
 * Grain + vignette + a very slight lift in the shadows so the blacks are warm
 * rather than dead. `tDiffuse` is the composer convention.
 */
const GrainVignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uGrain: { value: 0.055 },
    uVignette: { value: 1.05 },
    uLift: { value: new THREE.Color(0x0a0b10) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform vec3 uLift;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Lift the floor so the darkest regions carry the night colour rather
      // than clipping to pure black, which is what causes visible banding.
      vec3 lifted = texel.rgb + uLift * (1.0 - smoothstep(0.0, 0.35, length(texel.rgb)));

      // Vignette, measured in UV space so it does not stretch with aspect.
      vec2 centred = vUv - 0.5;
      float d = length(centred * vec2(1.0, 0.92));
      float vig = smoothstep(0.86, uVignette * 0.42, d);

      // Animated grain. Two frequencies so it does not read as a fixed pattern
      // crawling over the image.
      float g = hash(vUv * 512.0 + uTime * 60.0) * 0.6
              + hash(vUv * 137.0 - uTime * 31.0) * 0.4;
      vec3 grained = lifted + (g - 0.5) * uGrain;

      gl_FragColor = vec4(grained * vig, texel.a);
    }
  `,
};

export interface PostChain {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  setSize: (w: number, h: number, dpr: number) => void;
  /** `strength` is the route's default; chapters scale it. */
  update: (t: number, strength: number) => void;
  dispose: () => void;
}

export function createPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
  baseStrength = 0.72,
): PostChain {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    baseStrength,
    0.72,
    // Threshold above 0.72 in luminance, so only genuinely emissive things
    // bloom. Lower it and the whole frame goes milky.
    0.72,
  );
  composer.addPass(bloom);

  const grain = new ShaderPass(GrainVignetteShader);
  composer.addPass(grain);

  // OutputPass does the tone mapping and colour-space conversion that the
  // renderer's own output no longer does once a composer is in play. Without
  // it the image comes out washed and the wrong gamma.
  composer.addPass(new OutputPass());

  return {
    composer,
    bloom,
    setSize(w, h, dpr) {
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
      bloom.setSize(w * dpr, h * dpr);
    },
    update(t, strength) {
      // ShaderPass types `uniforms` as possibly-absent because a pass may
      // legitimately have none. This one declares uTime, so the guard is a
      // type assertion rather than a silent no-op.
      const u = grain.uniforms as { uTime: { value: number } };
      u.uTime.value = t;
      bloom.strength = strength;
    },
    dispose() {
      composer.dispose();
      bloom.dispose();
    },
  };
}

/** Kept so the grain texture helper stays reachable for a future film pass. */
export function grainTexture(seed: number): THREE.Texture {
  const tex = new THREE.CanvasTexture(paint({ kind: "grain", seed }).canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
