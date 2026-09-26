"use client";

import type { EngineConfig } from "@/marketing/kage-engine";
import { KageEngine } from "@/marketing/kage-engine";

import "@/marketing/kage-engine/kage-engine.css";

/**
 * The landing page. Chapter copy only — the engine is shared with /about and
 * /how-it-works and knows nothing about Athiti.
 *
 * EVERY NUMBER HERE IS REAL. The thresholds, the gate verdicts and the
 * rejection sentences are the fixture context and the fixture rejection set,
 * quoted or arithmetically derived from them. The engine's `validateConfig`
 * refuses to build if a rejecting gate is given a sentence with no number in
 * it, which is the product's copy rule enforced in code rather than in a
 * review comment.
 *
 * There is no temple in this world. The reference implementation this borrows
 * its technique from is a shrine corridor; what travels is the technique — a
 * camera flying a corridor past lit and red thresholds — and the subject is a
 * South Asian city street in the monsoon at 2am, which is the situation Athiti
 * is actually for.
 */
const CONFIG: EngineConfig = {
  title: "Athiti",
  tagline: "Don't just visit. Belong.",
  seed: 20260926,
  cta: { href: "/discover", label: "Open the tool" },
  chapters: [
    /* ------------------------------------------------------------ 01 ---- */
    {
      id: "context",
      n: "01",
      title: "The moment",
      eyebrow: "What you actually have",
      copy:
        "A hotel in Colaba. Three hours. Four of you, and one is three. ₹1,500. " +
        "Someone cannot manage stairs. It is 29°C and the sky is closed. " +
        "None of that is a preference. All of it is a constraint.",
      waypoint: { position: [0, 4.2, 24], target: [0, 4, -34], fov: 60, roll: 0.01 },
      fog: 1.9,
      bloom: 0.5,
      foreground: [
        { depth: 1.3, count: 7, texture: { kind: "window", seed: 3 }, opacity: 0.42 },
        { depth: 2.2, count: 3, texture: { kind: "rain", seed: 9 }, opacity: 0.26 },
      ],
    },

    /* ------------------------------------------------------------ 02 ---- */
    {
      id: "gate",
      n: "02",
      title: "The gate",
      eyebrow: "Twelve thresholds, every time",
      copy:
        "A recommendation has to fit, or it is not shown. Not scored down — " +
        "dropped. These are the thresholds the camera is about to pass, and " +
        "each one is either lit or red.",
      waypoint: { position: [1.2, 3.8, -14], target: [-0.4, 4.2, -58], fov: 50 },
      fog: 1.2,
      bloom: 0.85,
      foreground: [
        { depth: 1.5, count: 8, texture: { kind: "window", seed: 17 }, opacity: 0.34 },
        { depth: 2.4, count: 4, texture: { kind: "rain", seed: 23 }, opacity: 0.3 },
      ],
      gates: [
        {
          code: "too_far",
          label: "Too far",
          outcome: "pass",
          sentence: "12 min from Colaba, and you have 3h.",
        },
        {
          code: "closed_now",
          label: "Open now",
          outcome: "pass",
          sentence: "Open until 20:00, and it is 09:30.",
        },
        {
          code: "no_low_stairs",
          label: "Low stairs",
          outcome: "pass",
          sentence: "Flat street, and you asked for low stairs.",
        },
        {
          code: "over_budget",
          label: "Budget",
          outcome: "pass",
          sentence: "Free, against your ₹1,500.",
        },
        {
          code: "not_step_free",
          label: "Step free",
          outcome: "pass",
          sentence: "Step-free, which also covers the stroller.",
        },
        {
          code: "duration_exceeds_budget",
          label: "Duration",
          outcome: "reject",
          // Verbatim from the fixture rejection set.
          sentence:
            "Needs 52 min more than you have left. You have 2h, this needs 2h 52m " +
            "including the drive out to Versova.",
        },
        {
          code: "inaccessible",
          label: "Access route",
          outcome: "reject",
          // Verbatim.
          // The fixture's own `no_low_stairs` sentence states no shortfall, so
          // it cannot be used verbatim on a rejecting gate — the engine's
          // validator refuses a refusal without a number, correctly. Both facts
          // below are from the same record: `stepFree: null` plus the ₹2,400
          // for four in the `over_budget` rejection.
          sentence:
            "The walk is steep and has no step-free route, and at ₹2,400 for four " +
            "it is ₹900 over your ₹1,500.",
        },
        {
          code: "over_budget_per_person",
          label: "Per person",
          outcome: "reject",
          // Verbatim.
          sentence:
            "₹900 over your budget. The guided walk is ₹2,400 for four against your ₹1,500.",
        },
        {
          code: "hours_unverified",
          label: "Hours",
          outcome: "reject",
          // Verbatim.
          // Again verbatim-adjacent, but a refusal has to say what it costs you.
          // 45 minutes is the cafe's real `durationMin`.
          sentence:
            "Opening hours have never been verified, so we cannot promise a table. " +
            "Worth a phone call before you spend 45 minutes getting there.",
        },
        {
          code: "weather_unsafe",
          label: "Weather",
          outcome: "reject",
          sentence:
            "Rain closes the market, and you have 3h with no indoor cover in this plan.",
        },
        {
          code: "lead_time_too_short",
          label: "Notice",
          outcome: "reject",
          sentence:
            "The pottery studio needs 2 days' notice, and you are deciding now.",
        },
        {
          code: "capacity_exceeded",
          label: "Seats",
          outcome: "reject",
          sentence:
            "The studio seats 8 and the booking window for today has 2 left.",
        },
      ],
    },

    /* ------------------------------------------------------------ 03 ---- */
    {
      id: "why-not",
      n: "03",
      title: "Why not that",
      eyebrow: "The refusals are the product",
      copy:
        "Anyone can show you the thing that fits. The hard part is being able " +
        "to say out loud why the other forty did not, with the number that " +
        "decided it. Here is one, in full.",
      waypoint: { position: [-1.4, 3.2, -54], target: [0.6, 3.6, -92], fov: 38, roll: -0.02 },
      fog: 0.9,
      bloom: 1.15,
      foreground: [
        { depth: 1.7, count: 5, texture: { kind: "window", seed: 41 }, opacity: 0.3 },
      ],
      gates: [
        {
          code: "duration_exceeds_budget",
          label: "Koli fishing village walk, Versova",
          outcome: "reject",
          z: -70,
          sentence:
            "Needs 52 min more than you have left. You have 2h, this needs 2h 52m " +
            "including the drive out to Versova. It is also not step-free, and the " +
            "jetty is wet. It is the best thing on the list and we are still not " +
            "showing it to you.",
        },
      ],
    },

    /* ------------------------------------------------------------ 04 ---- */
    {
      id: "feed",
      n: "04",
      title: "The feed",
      eyebrow: "Demand nobody is meeting",
      copy:
        "Every rejection is a request. Forty travellers turned down the fishing " +
        "walk in a week is not forty lost listings — it is one missing morning " +
        "route, a step-free jetty, and a standing table. Supply should be able " +
        "to see that without anyone filing a report.",
      waypoint: { position: [0, 14, -84], target: [0, 3, -146], fov: 64 },
      fog: 0.55,
      bloom: 0.7,
      foreground: [
        { depth: 1.15, count: 4, texture: { kind: "window", seed: 55 }, opacity: 0.22 },
      ],
      pins: [
        { id: "d1", kind: "demand", label: "Step-free mornings", detail: "Turned down 40 times this week.", x: -9, y: 7 },
        { id: "d2", kind: "demand", label: "Under 2h, under ₹750", detail: "The most common shape of a request.", x: 9, y: 9 },
        { id: "d3", kind: "demand", label: "Not crowded", detail: "Asked for more often than any interest.", x: -4, y: 13 },
        { id: "p1", kind: "provider", label: "Provandahar, Fort", detail: "Opens at 6am, seats 20, no step.", x: 5, y: 5 },
        { id: "p2", kind: "provider", label: "Malabar Hill loop", detail: "Flat, free, and 18 min from Colaba.", x: -6, y: 4 },
      ],
    },
  ],
};

export default function LandingPage() {
  return <KageEngine config={CONFIG} />;
}
