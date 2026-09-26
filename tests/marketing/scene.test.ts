import { describe, expect, it } from "vitest";

import {
  activeIndex,
  chapterBandProgress,
  chapterMix,
  gateNearProgression,
  pinPulse,
} from "@/marketing/kage-engine/scene";

describe("chapterMix", () => {
  it("returns a one-hot at each chapter when scroll sits on it", () => {
    const mix = chapterMix(0.5, 3);
    // scroll 0.5 of a 3-chapter scene maps to pos 1 → chapter 1 at full weight.
    expect(mix).toHaveLength(3);
    expect(mix[0]).toBeCloseTo(0, 5);
    expect(mix[1]).toBeCloseTo(1, 5);
    expect(mix[2]).toBeCloseTo(0, 5);
  });

  it("cross-fades between two adjacent chapters", () => {
    const mix = chapterMix(0.5, 4);
    // 4 chapters: pos = 0.5*3 = 1.5 → equal split between chapter 1 and 2.
    expect(mix[0]).toBeCloseTo(0, 5);
    expect(mix[1]).toBeCloseTo(0.5, 5);
    expect(mix[2]).toBeCloseTo(0.5, 5);
    expect(mix[3]).toBeCloseTo(0, 5);
  });

  it("clamps scroll below 0 and above 1", () => {
    expect(chapterMix(-0.2, 3)[0]).toBeCloseTo(1, 5);
    expect(chapterMix(1.2, 3)[2]).toBeCloseTo(1, 5);
  });

  it("returns [1] for a single chapter", () => {
    expect(chapterMix(0.7, 1)).toEqual([1]);
  });
});

describe("activeIndex", () => {
  it("rounds the smoothed scroll to the nearest chapter", () => {
    expect(activeIndex(0.49, 3, 0.49)).toBe(1);
    expect(activeIndex(0.9, 3, 0.9)).toBe(2);
  });

  it("defaults the smoothed arg to scroll when omitted", () => {
    expect(activeIndex(0.9, 3)).toBe(2);
  });

  it("clamps into range", () => {
    expect(activeIndex(-1, 3)).toBe(0);
    expect(activeIndex(2, 3)).toBe(2);
  });
});

describe("chapterBandProgress", () => {
  it("active+retiring always sum to 1", () => {
    const n = 5;
    for (const s of [0, 0.13, 0.38, 0.5, 0.61, 0.9, 1]) {
      for (const { active, retiring } of chapterBandProgress(s, n)) {
        expect(active + retiring).toBeCloseTo(1, 5);
      }
    }
  });

  it("is a hard one-hot at each chapter centre, like the mix", () => {
    const bands = chapterBandProgress(0.5, 3);
    expect(bands[0]?.active).toBeCloseTo(0, 5);
    expect(bands[1]?.active).toBeCloseTo(1, 5);
    expect(bands[2]?.active).toBeCloseTo(0, 5);
  });
});

describe("gateNearProgression", () => {
  it("is 1 at the gate and falls to 0 past 34 units away", () => {
    expect(gateNearProgression(10, 10)).toBeCloseTo(1, 5);
    expect(gateNearProgression(0, 34)).toBeCloseTo(0, 5);
    expect(gateNearProgression(44, 10)).toBeCloseTo(0, 5);
  });

  it("is symmetric either side of the gate", () => {
    expect(gateNearProgression(10 - 17, 10)).toBeCloseTo(
      gateNearProgression(10 + 17, 10),
      5,
    );
  });
});

describe("pinPulse", () => {
  it("is a 0.16 amplitude pulse around 1", () => {
    const v = pinPulse(1000, 5);
    expect(v).toBeGreaterThanOrEqual(1 - 0.16);
    expect(v).toBeLessThanOrEqual(1 + 0.16);
  });
});
