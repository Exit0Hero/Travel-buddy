/**
 * Procedural textures. Every surface in this engine is painted on a 2D canvas
 * at runtime — there is not one image file in the world.
 *
 * WHY, when the reference implementation this borrows its technique from ships
 * photographic assets:
 *
 *  - A night street at 2am is a licensing question, a 300 KB download and a
 *    composition somebody else chose. A painted facade is 0 KB, generated at
 *    exactly the resolution the viewport needs, re-tintable per chapter, and
 *    incapable of being mistaken for a real place.
 *  - It lets the world react. `litRatio` drives how many windows are burning,
 *    so the Gate chapter can have the city mostly dark and the Feed chapter can
 *    have it awake, without shipping a second texture.
 *  - Determinism. A seeded PRNG means the same chapter looks the same on every
 *    load, which is what makes a screenshot review meaningful.
 *
 * The seeded PRNG is mulberry32. Not because it is the best PRNG, but because
 * it is four lines, has no dependencies, and is stable across engines.
 */
import type { TextureRecipe } from "./types";

/** Deterministic PRNG. Same seed, same city, every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PaintedTexture {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

function make(width: number, height: number): PaintedTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, width, height };
}

/**
 * A building face: a grid of windows, some lit, some not, over a dark slab.
 *
 * `litRatio` is the fraction of windows with a light behind them. `hue` shifts
 * the warmth of the interior light — sodium orange for older blocks, cold
 * fluorescent for newer ones. Mumbai's street lighting is mostly sodium, which
 * is why the default hue is deliberately amber rather than the blue-white a
 * lot of night-city art defaults to.
 */
function paintFacade(recipe: Extract<TextureRecipe, { kind: "facade" }>): PaintedTexture {
  const W = 256;
  const H = 512;
  const { canvas } = make(W, H);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: W, height: H };
  const rnd = mulberry32(recipe.seed);

  // The slab. Not flat: a vertical falloff so the base is darker than the
  // crown, which is what stops a facade reading as a printed swatch.
  const slab = ctx.createLinearGradient(0, 0, 0, H);
  slab.addColorStop(0, "#15161c");
  slab.addColorStop(1, "#0a0b0f");
  ctx.fillStyle = slab;
  ctx.fillRect(0, 0, W, H);

  const cols = 6 + Math.floor(rnd() * 4);
  const rows = 18 + Math.floor(rnd() * 10);
  const padX = 10;
  const padY = 14;
  const cw = (W - padX * 2) / cols;
  const ch = (H - padY * 2) / rows;

  for (let r = 0; r < rows; r++) {
    // Whole floors go dark together. Real buildings are unlet by floor, not by
    // window, and this one detail is most of what sells it.
    const floorLit = rnd() < recipe.litRatio * 1.35;
    for (let c = 0; c < cols; c++) {
      const x = padX + c * cw + cw * 0.18;
      const y = padY + r * ch + ch * 0.2;
      const w = cw * 0.64;
      const h = ch * 0.58;
      const lit = floorLit && rnd() < recipe.litRatio * 1.5;
      if (lit) {
        const warmth = recipe.hue + (rnd() - 0.5) * 14;
        const bright = 0.5 + rnd() * 0.5;
        const g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, `hsl(${warmth} 62% ${Math.round(34 + bright * 34)}%)`);
        g.addColorStop(1, `hsl(${warmth - 8} 54% ${Math.round(20 + bright * 22)}%)`);
        ctx.fillStyle = g;
      } else {
        // Dark glass still reflects a little sky, or it reads as a hole.
        ctx.fillStyle = `hsl(215 18% ${Math.round(9 + rnd() * 5)}%)`;
      }
      ctx.fillRect(x, y, w, h);

      // A mullion, so the window is a frame and not a sticker.
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w / 2, y + h);
      ctx.stroke();
    }
  }

  // Grime running down the slab, heavier under the window sills.
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const len = 20 + rnd() * 90;
    const streak = ctx.createLinearGradient(x, y, x, y + len);
    streak.addColorStop(0, "rgba(0,0,0,0.5)");
    streak.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = streak;
    ctx.fillRect(x, y, 1 + rnd() * 2, len);
  }
  ctx.globalAlpha = 1;

  return { canvas, width: W, height: H };
}

/**
 * A single lit window, used for the near foreground where a whole facade would
 * be overkill and would cost fill rate for nothing.
 */
function paintWindow(recipe: Extract<TextureRecipe, { kind: "window" }>): PaintedTexture {
  const S = 128;
  const { canvas } = make(S, S);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: S, height: S };
  const rnd = mulberry32(recipe.seed);

  const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,214,150,0.95)");
  g.addColorStop(0.35, "rgba(255,180,96,0.42)");
  g.addColorStop(1, "rgba(255,150,70,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  // A suggestion of a frame or a grille inside the glow.
  ctx.strokeStyle = "rgba(30,20,10,0.5)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    if (rnd() < 0.4) continue;
    ctx.beginPath();
    ctx.moveTo((S / 4) * i, S * 0.25);
    ctx.lineTo((S / 4) * i, S * 0.75);
    ctx.stroke();
  }
  return { canvas, width: S, height: S };
}

/**
 * Wet asphalt. The reflection is faked rather than raytraced: vertical smears
 * of colour sampled from a palette, brightest directly under where a light
 * would hang. Cheap, and at a grazing camera angle it is indistinguishable.
 */
function paintWetStreet(recipe: Extract<TextureRecipe, { kind: "wetStreet" }>): PaintedTexture {
  const W = 512;
  const H = 512;
  const { canvas } = make(W, H);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: W, height: H };
  const rnd = mulberry32(recipe.seed);

  ctx.fillStyle = "#07080b";
  ctx.fillRect(0, 0, W, H);

  // Reflected signage, smeared downward.
  const pools = 14;
  for (let i = 0; i < pools; i++) {
    const x = rnd() * W;
    const w = 6 + rnd() * 34;
    const top = rnd() * H * 0.4;
    const len = 90 + rnd() * 300;
    const hue = 18 + rnd() * 200;
    const g = ctx.createLinearGradient(x, top, x, top + len);
    g.addColorStop(0, `hsla(${hue} 80% 62% / ${0.3 + rnd() * 0.3})`);
    g.addColorStop(0.35, `hsla(${hue} 70% 50% / 0.16)`);
    g.addColorStop(1, "hsla(0 0% 0% / 0)");
    ctx.fillStyle = g;
    // Break each pool into strips so the reflection ripples rather than
    // reading as a solid column.
    const strips = 14 + Math.floor(rnd() * 10);
    for (let s = 0; s < strips; s++) {
      const sy = top + (len / strips) * s;
      const jitter = (rnd() - 0.5) * 8;
      ctx.fillRect(x + jitter, sy, w * (0.5 + rnd() * 0.6), len / strips + 1);
    }
  }

  // Puddles: darker, glossier, and they break up the tarmac.
  for (let i = 0; i < 10; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = 12 + rnd() * 46;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, "rgba(120,150,190,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return { canvas, width: W, height: H };
}

/**
 * A signage panel — the coloured light source that makes a night street read as
 * a street. Drawn as Devanagari/Latin-ish glyph blocks rather than real words,
 * because legible fake signage is worse than illegible signage: it looks like a
 * mistake, and a real brand name would be a trademark question.
 */
function paintSignage(recipe: Extract<TextureRecipe, { kind: "signage" }>): PaintedTexture {
  const W = 256;
  const H = 128;
  const { canvas } = make(W, H);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: W, height: H };
  const rnd = mulberry32(recipe.seed);

  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, W, H);

  const hue = recipe.hue;
  // The tube, not the panel — a vertical or horizontal run of light.
  const vertical = rnd() < 0.4;
  const glow = ctx.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W * 0.5);
  glow.addColorStop(0, `hsla(${hue} 90% 70% / 0.55)`);
  glow.addColorStop(1, `hsla(${hue} 90% 60% / 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = `hsl(${hue} 92% 72%)`;
  if (vertical) {
    ctx.fillRect(W / 2 - 4, 12, 8, H - 24);
  } else {
    ctx.fillRect(10, H / 2 - 4, W - 20, 8);
  }

  // Glyph blocks hanging off the tube.
  const count = 3 + Math.floor(rnd() * 4);
  for (let i = 0; i < count; i++) {
    const gw = 5 + rnd() * 8;
    const gh = 10 + rnd() * 20;
    const x = 14 + rnd() * (W - 40);
    const y = 12 + rnd() * (H - 40);
    ctx.fillStyle = `hsla(${hue + (rnd() - 0.5) * 30} 88% ${58 + rnd() * 18}% / 0.9)`;
    ctx.fillRect(x, y, gw, gh);
  }

  return { canvas, width: W, height: H };
}

/** Monsoon haze: soft overlapping blobs, used as a fog card and as the sky. */
function paintHaze(recipe: Extract<TextureRecipe, { kind: "haze" }>): PaintedTexture {
  const S = 512;
  const { canvas } = make(S, S);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: S, height: S };
  const rnd = mulberry32(recipe.seed);

  ctx.fillStyle = "#0a0c11";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * S;
    const y = rnd() * S * 0.8;
    const r = 60 + rnd() * 190;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    const hue = 200 + rnd() * 30;
    g.addColorStop(0, `hsla(${hue} 24% ${26 + rnd() * 16}% / 0.16)`);
    g.addColorStop(1, "hsla(0 0% 0% / 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return { canvas, width: S, height: S };
}

/** Rain streaks on a card. Tiled, so this one is small on purpose. */
function paintRain(recipe: Extract<TextureRecipe, { kind: "rain" }>): PaintedTexture {
  const W = 256;
  const H = 256;
  const { canvas } = make(W, H);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: W, height: H };
  const rnd = mulberry32(recipe.seed);

  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < 220; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const len = 8 + rnd() * 26;
    const a = 0.05 + rnd() * 0.16;
    const g = ctx.createLinearGradient(x, y, x + 3, y + len);
    g.addColorStop(0, `rgba(200,220,255,0)`);
    g.addColorStop(0.4, `rgba(200,220,255,${a})`);
    g.addColorStop(1, `rgba(200,220,255,0)`);
    ctx.strokeStyle = g;
    ctx.lineWidth = rnd() < 0.85 ? 1 : 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3, y + len);
    ctx.stroke();
  }
  return { canvas, width: W, height: H };
}

/** Monochrome grain, tiled by the post chain. */
function paintGrain(recipe: Extract<TextureRecipe, { kind: "grain" }>): PaintedTexture {
  const S = 256;
  const { canvas } = make(S, S);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: S, height: S };
  const rnd = mulberry32(recipe.seed);
  const img = ctx.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(rnd() * 90);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, width: S, height: S };
}

const PAINTERS: {
  [K in TextureRecipe["kind"]]: (r: Extract<TextureRecipe, { kind: K }>) => PaintedTexture;
} = {
  facade: paintFacade,
  window: paintWindow,
  wetStreet: paintWetStreet,
  signage: paintSignage,
  haze: paintHaze,
  rain: paintRain,
  grain: paintGrain,
};

export function paint(recipe: TextureRecipe): PaintedTexture {
  return PAINTERS[recipe.kind](recipe as never);
}
