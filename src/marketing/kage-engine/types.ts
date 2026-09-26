/**
 * The engine's configuration contract.
 *
 * THIS IS THE WHOLE POINT OF THE MODULE. Every route that uses the engine
 * supplies one of these objects and nothing else. The camera curve, the world,
 * the bloom, the grain, the parallax and the nav rail are all derived from
 * `chapters` — so a four-chapter landing page and a six-chapter explainer are
 * the same thousand lines of engine, differing only in data.
 *
 * The alternative, which this file exists to prevent, is one bespoke scroll
 * scene per page. Three routes would have been three copies of a camera rig,
 * three texture generators, three post chains, and three places to fix a
 * reduced-motion bug.
 *
 * NOTHING HERE IS ATHITI-PRODUCT DATA. Copy, chapter titles and waypoints are
 * supplied per route. The engine has no opinion about what a route says; it
 * only knows how to move a camera past it.
 */

/** A point the camera passes through, in world units. */
export interface Waypoint {
  /** Camera position. The rig interpolates between consecutive waypoints. */
  position: [number, number, number];
  /** What the camera looks at. */
  target: [number, number, number];
  /**
   * How wide the camera is at this waypoint, in degrees. A wide establishing
   * shot pulled back to 62, a close pass at 34 — the rhythm between them is
   * what makes a scroll feel like a camera move rather than a pan.
   */
  fov: number;
  /**
   * Optional roll in radians. Kept because a chapter that wants unease should
   * be able to ask for it in data rather than by editing the rig.
   */
  roll?: number;
}

/** One image plane that parallaxes faster than the world. */
export interface ForegroundLayer {
  /**
   * 0 = locked to the camera (an overlay), 1 = moves with the world. Foreground
   * reads best between 1.15 and 2.4 — past that it shears against the near
   * plane and starts to look like a bug.
   */
  depth: number;
  /** How many copies to distribute down the corridor. */
  count: number;
  /** Procedural texture to paint onto the planes. */
  texture: TextureRecipe;
  /** Plane opacity. */
  opacity?: number;
  /** Tint applied to the texture. */
  tint?: string;
  /** Whether the layer scrolls past as well as parallaxes. */
  scrollWithCamera?: boolean;
}

/**
 * How to paint a texture. Every texture in this engine is generated at runtime
 * on a 2D canvas — there is not one image file in the whole world.
 *
 * That is a deliberate constraint, not a limitation. A photograph of a Mumbai
 * street at night is a licensing question, a 400 KB download and a design
 * decision somebody else made. A procedural facade is 0 KB, is generated at the
 * exact size the viewport needs, can be re-tinted per chapter, and cannot be
 * mistaken for a place it is not.
 */
export type TextureRecipe =
  | { kind: "facade"; seed: number; litRatio: number; hue: number }
  | { kind: "wetStreet"; seed: number }
  | { kind: "signage"; seed: number; hue: number }
  | { kind: "haze"; seed: number }
  | { kind: "rain"; seed: number }
  | { kind: "grain"; seed: number }
  | { kind: "window"; seed: number };

/** A vertical gate the camera flies past. */
export interface ThresholdGate {
  /** Which RejectionCode vocabulary term this gate stands for. */
  code: string;
  /** The label on the gate. */
  label: string;
  /** `pass` gates light up, `reject` gates go red and carry a sentence. */
  outcome: "pass" | "reject";
  /**
   * A finished sentence with a real number in it. Required for `reject` gates
   * and ignored for `pass` gates. This is the product's copy rule and the
   * engine refuses to render a rejection without one — see `validateConfig`.
   */
  sentence?: string;
  /** World Z at which the gate stands. Gates are laid out automatically. */
  z?: number;
}

/** A point of interest that lights up as the camera arrives. */
export interface Pin {
  id: string;
  label: string;
  detail: string;
  /** `demand` pins are unmet demand, `provider` pins are supply. */
  kind: "demand" | "provider";
  x: number;
  y: number;
}

export interface Chapter {
  id: string;
  /** Chapter number as a string, e.g. "01". Rendered in the nav rail. */
  n: string;
  title: string;
  /** Optional second language, set in the same script as `title`. */
  jp?: string;
  /** Kicker above the title. */
  eyebrow?: string;
  /** The chapter's body. One or two sentences. */
  copy: string;
  /** Camera state when this chapter is centred. */
  waypoint: Waypoint;
  /** Foreground planes for this chapter. Omit to inherit the engine default. */
  foreground?: ReadonlyArray<ForegroundLayer>;
  /** Gates the camera flies past during this chapter. */
  gates?: ReadonlyArray<ThresholdGate>;
  /** Pins that light up during this chapter. */
  pins?: ReadonlyArray<Pin>;
  /** Fog density multiplier while this chapter is centred. 1 = default. */
  fog?: number;
  /** Bloom strength multiplier while centred. 1 = default. */
  bloom?: number;
}

export interface EngineConfig {
  /** Used for the document title suffix and the aria label on the region. */
  title: string;
  /** Short line under the wordmark in the nav rail. */
  tagline?: string;
  chapters: ReadonlyArray<Chapter>;
  /**
   * Where the primary action goes. MUST be a real route in this app. The engine
   * renders it as a plain focusable link, never as a canvas hotspot, so it is
   * reachable by keyboard with the WebGL context absent.
   */
  cta?: { href: string; label: string };
  /**
   * Reduced-motion fallback world. When `prefers-reduced-motion: reduce` is
   * set the engine does not build a camera rig at all — see `useEngine`.
   */
  seed?: number;
}

export class EngineConfigError extends Error {}

/**
 * Fail loudly on a config that would produce a dishonest page.
 *
 * A `reject` gate with no sentence is the one failure this engine treats as
 * fatal rather than cosmetic. The product's copy rule is that a refusal is
 * always a finished sentence carrying a real number — never "constraint
 * violated" — and a scroll scene is exactly the place where that rule gets
 * quietly dropped to save typing. So the engine refuses to build.
 */
export function validateConfig(config: EngineConfig): void {
  if (config.chapters.length === 0) {
    throw new EngineConfigError("A kage-engine page needs at least one chapter.");
  }
  const seen = new Set<string>();
  for (const chapter of config.chapters) {
    if (seen.has(chapter.id)) {
      throw new EngineConfigError(`Duplicate chapter id "${chapter.id}".`);
    }
    seen.add(chapter.id);
    for (const gate of chapter.gates ?? []) {
      if (gate.outcome === "reject" && !gate.sentence) {
        throw new EngineConfigError(
          `Gate "${gate.code}" in chapter "${chapter.id}" rejects without a sentence. ` +
            `A refusal must be a finished sentence with a real number in it.`,
        );
      }
      if (gate.outcome === "reject" && !/\d/.test(gate.sentence ?? "")) {
        throw new EngineConfigError(
          `Gate "${gate.code}" in chapter "${chapter.id}" has a rejection sentence with no ` +
            `number in it. Every refusal states the shortfall.`,
        );
      }
    }
  }
  /*
    A CTA may point at a route OR at a fragment on the current page.

    The original rule demanded a leading slash, on the reasoning that a CTA must
    resolve to a real route. That was right for a multi-route app and wrong for
    this one: the app is a single page, the tool lives below the story, and
    `#tool` is both a valid target and the one that keeps working when the
    WebGL context is absent — which is exactly when somebody is most likely to
    press it. A same-page fragment is therefore not a loophole around the rule,
    it is the correct answer to it.

    What is still rejected is a relative path (`discover`) or an external URL:
    the first is ambiguous about the origin it resolves against and the second
    is a navigation out of the app, and neither is what a CTA on a single page
    should ever be.
  */
  if (config.cta) {
    const href = config.cta.href;
    const isFragment = href.startsWith("#") && href.length > 1;
    const isPath = href.startsWith("/") && !href.startsWith("//");
    if (!isFragment && !isPath) {
      throw new EngineConfigError(
        `CTA href "${href}" is neither a same-page fragment (#id) nor a ` +
          `same-origin path (/route). The engine does not link to relative ` +
          `paths or to external origins.`,
      );
    }
  }
}

/** Even Z spacing for gates that did not ask for a specific position. */
export function gateZ(index: number, perChapter: number): number {
  return -(index * 9 + perChapter * 2.5);
}
