"use client";

import type { EngineConfig } from "@/marketing/kage-engine";
import { KageEngine } from "@/marketing/kage-engine";

import "@/marketing/kage-engine/kage-engine.css";

/**
 * /about — three chapters, same engine as the landing page.
 *
 * Nothing here is invented. The thesis is quoted from README line 64, the
 * pipeline is the seam's own published function list, and the three-stream
 * split is TASKS.md. If any of those change, this page changes with them, and
 * that is the point: a page that restates the project's own words cannot drift
 * away from them the way a paraphrase does.
 */
const CONFIG: EngineConfig = {
  title: "Athiti",
  tagline: "Why it is built this way",
  seed: 778,
  cta: { href: "/discover", label: "See it working" },
  chapters: [
    {
      id: "thesis",
      n: "01",
      title: "The thesis",
      eyebrow: "One sentence, and everything follows from it",
      copy:
        "A recommendation must fit, or it is not shown. Not ranked lower — " +
        "removed. Everything else in this repository is downstream of refusing " +
        "to show a traveller something that would waste their afternoon.",
      waypoint: { position: [0, 4, 20], target: [0, 4, -30], fov: 58 },
      fog: 1.7,
      bloom: 0.55,
    },
    {
      id: "pipeline",
      n: "02",
      title: "The pipeline",
      eyebrow: "Seven public functions, one contract",
      copy:
        "retrieve, filterFeasible, score, pack, validate, replan, computeFit, " +
        "stress, isOpenDuring, travelBetween, observe. The engine publishes " +
        "exactly that surface and nothing else, and a test fails the build if " +
        "it grows. The interface is frozen because the moment one stream can " +
        "widen it, the other two stop being able to build in parallel.",
      waypoint: { position: [1, 3.6, -16], target: [0, 4, -60], fov: 46 },
      fog: 1.05,
      bloom: 0.9,
      gates: [
        { code: "retrieve", label: "retrieve", outcome: "pass" },
        { code: "filterFeasible", label: "filterFeasible", outcome: "pass" },
        { code: "score", label: "score", outcome: "pass" },
        { code: "pack", label: "pack", outcome: "pass" },
        { code: "validate", label: "validate", outcome: "pass" },
        { code: "replan", label: "replan", outcome: "pass" },
      ],
    },
    {
      id: "streams",
      n: "03",
      title: "Three streams",
      eyebrow: "Nobody blocks anybody",
      copy:
        "Abhijit owns the engine, the data and the contract. Karan owns the " +
        "interface. Vishwesh owns the language and the LLM seam. The contract " +
        "is the only shared surface, it is frozen, and the other two build " +
        "against it in parallel. A field that has to change changes in that " +
        "one file, in its own commit, and the rest rebase.",
      waypoint: { position: [-1.2, 5, -56], target: [0.4, 3.4, -96], fov: 52 },
      fog: 0.7,
      bloom: 0.75,
      pins: [
        { id: "a", kind: "provider", label: "Abhijit", detail: "Engine, data, contract. Owner of contracts/index.ts.", x: -7, y: 6 },
        { id: "k", kind: "provider", label: "Karan", detail: "Interface. src/app, src/components, src/styles.", x: 0, y: 8 },
        { id: "v", kind: "provider", label: "Vishwesh", detail: "Language, content, LLM seam.", x: 7, y: 6 },
      ],
    },
  ],
};

export default function AboutPage() {
  return <KageEngine config={CONFIG} />;
}
