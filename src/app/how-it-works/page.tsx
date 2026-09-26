"use client";

import type { EngineConfig } from "@/marketing/kage-engine";
import { KageEngine } from "@/marketing/kage-engine";

import "@/marketing/kage-engine/kage-engine.css";

/**
 * /how-it-works — six chapters, one per pipeline stage, same engine again.
 *
 * Each chapter ends on the constraint list that stage is actually responsible
 * for, taken from the frozen contract's own `RejectionCode` vocabulary. Two
 * stages carry a rejecting gate, and both of those carry a real number, because
 * the engine refuses to build a refusal that does not.
 *
 * The stages are the six that decide an answer. `replan`, `computeFit`,
 * `stress`, `isOpenDuring`, `travelBetween` and `observe` are also published,
 * but they refine or re-derive an answer rather than producing the first one,
 * so they are named in the pack chapter rather than given their own.
 */
const CONFIG: EngineConfig = {
  title: "Athiti",
  tagline: "How the answer is built",
  seed: 3141,
  cta: { href: "/discover", label: "Run it on your own context" },
  chapters: [
    {
      id: "context",
      n: "01",
      title: "Context",
      eyebrow: "Stage one of six",
      copy:
        "Everything the traveller brings, in one object: how long they have, " +
        "where they are starting from, the budget, who they are with, any " +
        "access needs, the weather, the interests, and what they would rather " +
        "avoid. It is the only input. There is no other signal.",
      waypoint: { position: [0, 4, 20], target: [0, 4, -28], fov: 60 },
      fog: 1.8,
      bloom: 0.5,
    },
    {
      id: "retrieve",
      n: "02",
      title: "Retrieve",
      eyebrow: "Stage two of six",
      copy:
        "Pull candidates out of the catalogue, scored on distance from where " +
        "the traveller actually is rather than on how famous they are. A place " +
        "four hours away cannot fit a three-hour afternoon, so it never enters " +
        "the conversation.",
      waypoint: { position: [1.2, 3.8, -14], target: [-0.4, 4, -56], fov: 50 },
      fog: 1.2,
      bloom: 0.7,
    },
    {
      id: "gate",
      n: "03",
      title: "Gate",
      eyebrow: "Stage three of six",
      copy:
        "Twenty-five hard constraints, and this is where most candidates die. " +
        "A gate is binary: it passes or it does not, and there is no partial " +
        "credit anywhere in this stage. Everything that survives is feasible.",
      waypoint: { position: [-1, 3.4, -44], target: [0.6, 4, -86], fov: 44 },
      fog: 0.95,
      bloom: 1.05,
      gates: [
        { code: "closed_now", label: "open_now", outcome: "pass" },
        { code: "capacity_exceeded", label: "capacity", outcome: "pass" },
        { code: "weather_unsafe", label: "weather", outcome: "reject", sentence: "Rain closes the market, and you have 3h with no indoor cover in this plan." },
        { code: "lead_time_too_short", label: "lead_time", outcome: "reject", sentence: "The pottery studio needs 2 days' notice, and you are deciding now." },
        { code: "seasonal_mismatch", label: "season", outcome: "pass" },
        { code: "diet_mismatch", label: "diet", outcome: "pass" },
      ],
    },
    {
      id: "score",
      n: "04",
      title: "Score",
      eyebrow: "Stage four of six",
      copy:
        "Only now does preference get a say. Nine weights, each one a number " +
        "a traveller can inspect and edit by hand, ranked on a profile that " +
        "starts as a prior and moves as they dismiss and save things. The " +
        "breakdown is shown, because a recommendation you cannot interrogate is " +
        "just a feeling.",
      waypoint: { position: [0.8, 4.2, -74], target: [-0.4, 4, -116], fov: 48 },
      fog: 0.8,
      bloom: 0.9,
      pins: [
        { id: "w1", kind: "provider", label: "accessibility 1.00", detail: "The heaviest weight, because a stair is a hard no.", x: -6, y: 7 },
        { id: "w2", kind: "provider", label: "categoryFit 0.90", detail: "What the traveller said they wanted.", x: 6, y: 8 },
        { id: "w3", kind: "provider", label: "novelty 0.30", detail: "The lightest. Familiarity is not a virtue here.", x: 0, y: 5 },
      ],
    },
    {
      id: "pack",
      n: "05",
      title: "Pack",
      eyebrow: "Stage five of six",
      copy:
        "Turn a ranked list into a plan with times on it. This is where " +
        "computeFit spends the time budget between activity, travel and buffer, " +
        "where travelBetween decides each leg, and where the packer relaxes in " +
        "rungs — strict, then drop the minimum, then greedy fill, then single " +
        "best — recording every rung it had to take.",
      waypoint: { position: [-0.8, 3.2, -104], target: [0.5, 3.6, -146], fov: 46 },
      fog: 0.7,
      bloom: 0.8,
      gates: [
        { code: "relaxation", label: "strict", outcome: "pass" },
        { code: "relaxation", label: "dropped_minimum", outcome: "pass" },
        { code: "relaxation", label: "greedy_fill", outcome: "pass" },
        { code: "relaxation", label: "single_best", outcome: "reject", sentence: "At 1 rung the plan holds. At 4 rungs it has given up enough to be worth arguing with." },
      ],
    },
    {
      id: "validate",
      n: "06",
      title: "Validate",
      eyebrow: "Stage six of six",
      copy:
        "Recompute the objective the packer claimed and check it against what " +
        "it actually built. A violation is returned, not swallowed. This is the " +
        "stage that makes the other five trustworthy, and it is the reason the " +
        "engine's surface is frozen: a claim nobody re-derives is a claim " +
        "nobody should act on.",
      waypoint: { position: [0, 12, -134], target: [0, 3, -180], fov: 58 },
      fog: 0.55,
      bloom: 1.0,
    },
  ],
};

export default function HowItWorksPage() {
  return <KageEngine config={CONFIG} />;
}
