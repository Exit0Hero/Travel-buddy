"use client";

import { useEffect, useRef, useState } from "react";

import * as THREE from "three";

import { buildParallax, type ParallaxHandles } from "./parallax";
import { createPost, type PostChain } from "./post";
import { createRig, type Rig } from "./rig";
import { scaleCss } from "./scale";
import { validateConfig, type EngineConfig } from "./types";
import { buildWorld, type WorldHandles } from "./world";

export interface KageEngineProps {
  config: EngineConfig;
  /** Extra class on the root, for route-specific layout. */
  className?: string;
}

/** Gate outcome → the word and colour the scene uses. */
const OUTCOME_WORD: Record<string, string> = { pass: "Passes", reject: "Rejected" };

/**
 * The engine. One component, three routes.
 *
 * STRUCTURE OF A FRAME:
 *   - a fixed canvas behind everything, `aria-hidden`, because the text below is
 *     the accessible version of the same content and a canvas has nothing to say
 *     to a screen reader;
 *   - a scrolling column of chapter sections, which is the real content and the
 *     thing a keyboard or a reduced-motion reader actually gets;
 *   - a fixed nav rail and a plain `<a>` for the CTA.
 *
 * The scroll is native. Nothing here calls `preventDefault` on a wheel or touch
 * event, and there is no `scroll-snap`, because both are the two behaviours that
 * make a scroll hijack hostile. The camera reads `scrollY`; the page still
 * scrolls.
 */
export function KageEngine({ config, className }: KageEngineProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState(false);

  // The config is rebuilt on every render by the route; hold the last valid one
  // so the effect does not tear down the whole scene on a parent re-render.
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    try {
      validateConfig(configRef.current);
    } catch (error) {
      console.error("[kage-engine] invalid config:", error);
      setFailed(true);
    }
  }, [config]);

  /* ------------------------------------------------- reduced-motion watching */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /* ------------------------------------------------------------- the scene */
  useEffect(() => {
    const host = canvasHostRef.current;
    const root = rootRef.current;
    if (!host || !root || failed) return;
    if (reduced) {
      // Deliberately no renderer, no scene, no RAF. Under reduced motion the
      // route is the text and nothing else. Building a GL context and then
      // parking the camera would still cost a GPU and still move on resize.
      return;
    }

    const cfg = configRef.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.error("[kage-engine] WebGL unavailable:", error);
      setFailed(true);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const world: WorldHandles = buildWorld(cfg);
    scene.add(world.group);

    const parallax: ParallaxHandles = buildParallax(
      cfg.chapters[0]?.foreground ?? [
        { depth: 1.4, count: 6, texture: { kind: "window", seed: 7 }, opacity: 0.5 },
        { depth: 2.1, count: 3, texture: { kind: "rain", seed: 11 }, opacity: 0.3 },
      ],
      -18,
    );
    scene.add(parallax.group);

    const rig: Rig = createRig(
      cfg,
      host.clientWidth / Math.max(1, host.clientHeight),
      false,
    );
    scene.add(rig.camera);

    const post: PostChain = createPost(
      renderer,
      scene,
      rig.camera,
      host.clientWidth,
      host.clientHeight,
      0.72,
    );

    /* ------------------------------------------------------------- gates */
    // Gates are real geometry, placed from config, and they are the only thing
    // in the scene that is not decorative: each one is a threshold the camera
    // physically passes, and its colour is the verdict.
    const gateGroup = new THREE.Group();
    /** Typed alongside the meshes so no `userData` cast is needed anywhere. */
    const gateMeshes: Array<{ mesh: THREE.Mesh; z: number; outcome: string }> = [];
    const gateLabels: Array<{ el: HTMLDivElement; chapter: number }> = [];
    const gateGeo = new THREE.PlaneGeometry(1, 1);
    cfg.chapters.forEach((chapter, ci) => {
      (chapter.gates ?? []).forEach((gate, gi) => {
        // Relative to THIS chapter's waypoint. A global Z ramp put chapter 1's
        // first gate eight units in front of the chapter 1 camera, which filled
        // the opening frame with a coloured wall.
        const z = gate.z ?? chapter.waypoint.position[2] - 16 - gi * 7;
        const colour = gate.outcome === "pass" ? 0x7fd0c4 : 0xe88b7c;
        const mat = new THREE.MeshBasicMaterial({
          color: colour,
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          fog: false,
        });
        const mesh = new THREE.Mesh(gateGeo, mat);
        // Frame-shaped, so the camera flies THROUGH it.
        const tall = gate.sentence ? 7.5 : 5.5;
        mesh.scale.set(15, tall, 1);
        mesh.position.set(0, 3.6, z);
        gateGroup.add(mesh);
        gateMeshes.push({ mesh, z, outcome: gate.outcome });

        // The label is DOM, not a texture. Text baked into a canvas is
        // unreadable to assistive tech, unselectable, and blurry on a
        // high-DPI panel.
        const el = document.createElement("div");
        el.className = "kage-gate-label";
        el.dataset.outcome = gate.outcome;
        el.innerHTML =
          `<span class="kage-gate-label__verdict">${OUTCOME_WORD[gate.outcome] ?? gate.outcome}</span>` +
          `<span class="kage-gate-label__code"></span>` +
          (gate.sentence ? `<span class="kage-gate-label__sentence"></span>` : "");
        const codeEl = el.querySelector(".kage-gate-label__code");
        if (codeEl) codeEl.textContent = gate.label;
        const sentenceEl = el.querySelector(".kage-gate-label__sentence");
        if (sentenceEl && gate.sentence) sentenceEl.textContent = gate.sentence;
        root.appendChild(el);
        gateLabels.push({ el, chapter: ci });
      });
    });
    scene.add(gateGroup);

    /* -------------------------------------------------------------- pins */
    // Demand and supply, placed in the chapter's own stretch of the corridor.
    // A demand pin is an unmet request the city cannot currently satisfy; a
    // provider pin is a place that could. They are different colours and they
    // are also different words, because the distinction is the product.
    const pinGroup = new THREE.Group();
    const pinSprites: THREE.Mesh[] = [];
    cfg.chapters.forEach((chapter, ci) => {
      const pins = chapter.pins ?? [];
      pins.forEach((pin, pi) => {
        const g = new THREE.Mesh(
          new THREE.SphereGeometry(0.34, 10, 8),
          new THREE.MeshBasicMaterial({
            color: pin.kind === "demand" ? 0xe88b7c : 0x7fd0c4,
            fog: false,
          }),
        );
        // Sit the pin just in front of the camera's waypoint for this chapter,
        // spread laterally so a cluster does not stack into one dot.
        const spread = pins.length > 1 ? (pi / (pins.length - 1) - 0.5) * 18 : 0;
        g.position.set(
          pin.x !== undefined ? pin.x : spread,
          pin.y,
          chapter.waypoint.position[2] - 14 - ci,
        );
        pinGroup.add(g);
        pinSprites.push(g);
      });
    });
    scene.add(pinGroup);

    /* ------------------------------------------------------------- resize */
    const onResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      rig.camera.aspect = w / h;
      rig.camera.updateProjectionMatrix();
      post.setSize(w, h, dpr);
    };
    window.addEventListener("resize", onResize);
    onResize();

    /* -------------------------------------------------------------- frame */
    let raf = 0;
    let last = performance.now();
    let lastActive = -1;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      // How far through the whole narrative we are. Measured against the
      // chapter column, not the viewport, so the camera and the text stay in
      // step no matter how tall a chapter is.
      const column = root.querySelector<HTMLElement>(".kage-chapters");
      const total = column ? Math.max(1, column.scrollHeight - window.innerHeight) : 1;
      const scroll = Math.min(1, Math.max(0, window.scrollY / total));

      rig.update(scroll, dt);
      parallax.update(rig.camera.position.z);

      const mix = rig.chapterMix;

      // Per-chapter fog, blended by the same weights as everything else. The
      // opening chapter asks for 1.9x the base density so the city genuinely
      // resolves out of the haze rather than merely being described as doing so.
      let fogScale = 0;
      let bloom = 0;
      let weight = 0;
      cfg.chapters.forEach((chapter, i) => {
        const m = mix[i] ?? 0;
        fogScale += (chapter.fog ?? 1) * m;
        bloom += (chapter.bloom ?? 1) * m;
        weight += m;
      });
      const w = weight > 0.001 ? weight : 1;
      world.update(scroll, fogScale / w);
      post.update(now * 0.001, bloom / w);

      // Gates brighten as the camera reaches them, so the pass reads as an
      // event rather than a texture sliding by.
      for (const { mesh, z } of gateMeshes) {
        const gate0 = mesh;
        const dist = Math.abs(z - rig.camera.position.z);
        const near = Math.max(0, 1 - dist / 34);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.1 + near * 0.5;
        const baseTall = gate0.scale.y > 6 ? 7.5 : 5.5;
        mesh.scale.y = baseTall + near * 1.6;
      }
      for (const pin of pinSprites) {
        const pulse = 1 + Math.sin(now * 0.003 + pin.position.x) * 0.16;
        pin.scale.setScalar(pulse);
      }

      // Fade the in-scene gate labels in with their chapter.
      for (const { el, chapter } of gateLabels) {
        const activeMix = mix[chapter] ?? 0;
        if (activeMix < 0.12) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          continue;
        }
        el.style.opacity = String(Math.min(1, (activeMix - 0.12) * 2.4));
        el.style.pointerEvents = "auto";
      }

      post.composer.render();

      const idx = rig.activeIndex();
      if (idx !== lastActive) {
        lastActive = idx;
        setActive(idx);
      }
    };
    raf = requestAnimationFrame(frame);

    /* ------------------------------------------------------------ cleanup */
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      for (const { el } of gateLabels) el.remove();
      world.dispose();
      parallax.dispose();
      post.dispose();
      rig.dispose();
      gateGeo.dispose();
      gateMeshes.forEach(({ mesh }) => (mesh.material as THREE.Material).dispose());
      pinSprites.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [reduced, failed]);

  /* ----------------------------------------------------------------- DOM */
  const cfg = config;

  return (
    <div
      ref={rootRef}
      className={`kage-root${className ? ` ${className}` : ""}`}
      style={{ ["--cine-scale" as string]: scaleCss() }}
    >
      <style>{scaleCss()}</style>

      {/* The canvas. Decorative: everything it shows is also in the DOM below. */}
      <div ref={canvasHostRef} className="kage-canvas" aria-hidden="true" />

      {failed ? (
        <p className="kage-notice" role="status">
          This page needs a WebGL context that this browser did not provide. Every
          word below is still here.
        </p>
      ) : null}

      <a className="kage-skip" href="#kage-content">
        Skip to the text
      </a>

      <nav className="kage-rail" aria-label="Chapters">
        <p className="kage-rail__title">{cfg.title}</p>
        {cfg.tagline ? <p className="kage-rail__tagline">{cfg.tagline}</p> : null}
        <ol className="kage-rail__list">
          {cfg.chapters.map((chapter, i) => (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                className="kage-rail__item"
                aria-current={i === active ? "true" : undefined}
              >
                <span className="kage-rail__n">{chapter.n}</span>
                <span className="kage-rail__label">{chapter.title}</span>
              </a>
            </li>
          ))}
        </ol>
        {/*
          The CTA is a real anchor to a real route, in the normal tab order, at
          the top of the document. It is not drawn on the canvas and it does not
          need the camera, the WebGL context or a scroll to be usable.
        */}
        {cfg.cta ? (
          <a className="kage-cta" href={cfg.cta.href}>
            {cfg.cta.label}
          </a>
        ) : null}
      </nav>

      <main id="kage-content" className="kage-chapters">
        {cfg.chapters.map((chapter, i) => (
          <section
            key={chapter.id}
            id={chapter.id}
            className="kage-chapter"
            aria-labelledby={`${chapter.id}-h`}
            data-active={i === active ? "true" : undefined}
          >
            <div className="kage-chapter__inner">
              {chapter.eyebrow ? (
                <p className="kage-eyebrow">{chapter.eyebrow}</p>
              ) : null}
              <h2 id={`${chapter.id}-h`} className="kage-chapter__title">
                <span className="kage-chapter__n">{chapter.n}</span>
                {chapter.title}
                {chapter.jp ? (
                  <span className="kage-chapter__jp" lang="ja">
                    {chapter.jp}
                  </span>
                ) : null}
              </h2>
              <p className="kage-chapter__copy">{chapter.copy}</p>

              {chapter.gates && chapter.gates.length > 0 ? (
                <ul className="kage-gates">
                  {chapter.gates.map((gate) => (
                    <li
                      key={gate.code}
                      className="kage-gate"
                      data-outcome={gate.outcome}
                    >
                      <span className="kage-gate__verdict">
                        {OUTCOME_WORD[gate.outcome] ?? gate.outcome}
                      </span>
                      <span className="kage-gate__code">{gate.label}</span>
                      {gate.sentence ? (
                        <span className="kage-gate__sentence">{gate.sentence}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {chapter.pins && chapter.pins.length > 0 ? (
                <ul className="kage-pins">
                  {chapter.pins.map((pin) => (
                    <li key={pin.id} className="kage-pin" data-kind={pin.kind}>
                      <span className="kage-pin__label">{pin.label}</span>
                      <span className="kage-pin__detail">{pin.detail}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}

        {cfg.cta ? (
          <div className="kage-chapter kage-chapter--end">
            <a className="kage-cta kage-cta--end" href={cfg.cta.href}>
              {cfg.cta.label}
            </a>
          </div>
        ) : null}
      </main>
    </div>
  );
}
