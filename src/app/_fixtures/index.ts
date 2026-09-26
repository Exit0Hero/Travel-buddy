/**
 * Development fixtures.
 *
 * WHY THIS EXISTS. The engine (`src/engine/**`), the data layer (`src/data/**`)
 * and the database (`src/db/**`) are all Abhijit's and none of them exist yet.
 * TASKS.md Rule 2 says: build against the contract and stub, never write into
 * another owner's directory. So the UI is developed and demoed against fixtures
 * that satisfy the frozen contract exactly, and when the engine lands these are
 * deleted in one commit and the route handlers start calling the real thing.
 *
 * WHAT MAKES THIS SAFE. Every fixture is parsed with the contract's own zod
 * schema at module load. A fixture that drifts from `src/contracts/index.ts`
 * throws immediately with a zod path, rather than quietly rendering `undefined`
 * and shipping a broken card. That is the enforcement mechanism for Rule 1 from
 * the consuming side — the contract is not just a type, it is a runtime gate.
 *
 * WHERE THIS LIVES. `src/app/**` is Karan's (TASKS.md). Nothing here is
 * production data and nothing here is written into a stream that is not mine.
 */
import {
  Experience,
  Fit,
  Plan,
  PlanStop,
  Rejection,
  ScoreBreakdown,
  TravelLeg,
  WeightProfile,
  type DiscoveryContext,
} from "@/contracts";

/* ==========================================================================
   CATALOGUE
   Real Colaba / Fort / Marine Drive / Bandra places, because a demo set of
   `Experience 1`, `Experience 2` cannot tell you whether the type scale works.
   ========================================================================== */

const allTrue = {
  stepFree: true,
  strollerOk: true,
  lowStairs: true,
  seatingAvailable: true,
  hearingLoop: false,
  restroomOnSite: true,
} as const;

const unknownAccess = {
  stepFree: null,
  strollerOk: null,
  lowStairs: null,
  seatingAvailable: null,
  hearingLoop: null,
  restroomOnSite: null,
} as const;

function experience(input: unknown): Experience {
  return Experience.parse(input);
}

export const FIXTURE_EXPERIENCES: Experience[] = [
  experience({
    id: "exp_kala ghoda_01",
    name: "Kala Ghoda flea market",
    category: "market",
    location: { lat: 18.928, lon: 72.8323 },
    durationMin: 75,
    pricePerPerson: { minor: 0, currency: "INR" },
    capacity: null,
    hours: { raw: "Mo-Su 11:00-20:00", status: "ok", lastVerified: "2026-08-14" },
    indoorOutdoor: "outdoor",
    accessibility: { ...allTrue, hearingLoop: null },
    kidFriendly: true,
    minAge: null,
    diets: ["vegetarian"],
    cuisines: [],
    rating: { value: 4.4, count: 1284, rawMean: 4.38 },
    blurb: "Antiques, brass and a great deal of bargaining on a street that closes at dusk.",
    description:
      "Runs every evening along the MG Road stretch. The bronzeware at the north end is the reason to come; the books and records are a bonus.",
    keywords: ["flea market", "bazaar", "antiques", " Kala Ghoda"],
    perception: {
      landscape: ["street", "colonial buildings"],
      activities: ["browsing", "bargaining"],
      atmosphere: ["bustling", "lively"],
    },
    bestTimeOfDay: ["evening"],
    requiresJourney: false,
    booking: { required: false, leadTimeMin: 0, walkIn: true },
    bestMonths: [11, 12, 1, 2, 3],
    weatherSensitive: "rain",
    provenance: { durationMin: "curated", pricePerPerson: "curated", accessibility: "osm" },
    providerId: null,
    neighbourhood: "Fort",
    city: "Mumbai",
  }),
  experience({
    id: "exp_dharmashala_02",
    name: "Dhobi Ghat guided walk",
    category: "heritage_site",
    location: { lat: 18.9889, lon: 72.8133 },
    durationMin: 90,
    pricePerPerson: { minor: 60000, currency: "INR" },
    capacity: 12,
    hours: { raw: "Mo-Sa 08:00-12:00", status: "ok", lastVerified: "2026-07-02" },
    indoorOutdoor: "outdoor",
    // Step-free is null, not false. iD's `wheelchair` tag is 3-state and a
    // provider who has not been surveyed has not said no.
    accessibility: { ...unknownAccess, seatingAvailable: true },
    kidFriendly: false,
    minAge: 12,
    diets: [],
    cuisines: [],
    rating: { value: 4.6, count: 312, rawMean: 4.71 },
    blurb: "Open-air laundry, hundreds of years of it, best seen before the heat.",
    description:
      "A heritage walk through Mahalaxmi's open-air laundry. Steep in places and no step-free route, so it is not suitable for every body.",
    keywords: ["dhobi ghat", "heritage walk", "laundry", " Mahalaxmi"],
    perception: {
      landscape: ["washing lines", "brick arches"],
      activities: ["walking", "photography"],
      atmosphere: ["working", "humble"],
    },
    bestTimeOfDay: ["early_morning", "morning"],
    requiresJourney: false,
    booking: { required: true, leadTimeMin: 1440, walkIn: false },
    bestMonths: [11, 12, 1, 2],
    weatherSensitive: "heat",
    // Two inferred fields, so the AI-inferred badge has something to badge.
    provenance: { durationMin: "curated", pricePerPerson: "provider", description: "inferred" },
    providerId: "prov_mahalaxmi_01",
    neighbourhood: "Mahalaxmi",
    city: "Mumbai",
  }),
  experience({
    id: "exp_sea_shell_03",
    name: "Marine Drive shell museum walk",
    category: "heritage_site",
    location: { lat: 18.944, lon: 72.8231 },
    durationMin: 60,
    pricePerPerson: { minor: 0, currency: "INR" },
    capacity: null,
    hours: { raw: "Mo-Su 06:00-22:00", status: "ok", lastVerified: "2026-08-30" },
    indoorOutdoor: "outdoor",
    accessibility: allTrue,
    kidFriendly: true,
    minAge: null,
    diets: [],
    cuisines: [],
    // Three reviews. The rating is smoothed toward the prior and the count is
    // shown, which is the whole reason `Rating` carries a raw count.
    rating: { value: 4.4, count: 3, rawMean: 5.0 },
    blurb: "The promenade itself is the attraction, and it is free at any hour.",
    description:
      "A gentle loop along the Queen's Necklace with three stops on the geology of the shore. Flat the whole way.",
    keywords: ["marine drive", "seafront", "promenade", "walk", "free"],
    perception: {
      landscape: ["sea", "promenade", "art deco"],
      activities: ["walking", "watching the sea"],
      atmosphere: ["calm", "open"],
    },
    bestTimeOfDay: ["evening", "early_morning"],
    requiresJourney: false,
    booking: { required: false, leadTimeMin: 0, walkIn: true },
    bestMonths: [1, 2, 3, 4, 10, 11, 12],
    weatherSensitive: "none",
    provenance: { durationMin: "curated", pricePerPerson: "curated" },
    providerId: null,
    neighbourhood: "Malabar Hill",
    city: "Mumbai",
  }),
  experience({
    id: "exp_pottery_04",
    name: "Kumbharwada pottery session",
    category: "craft_workshop",
    location: { lat: 19.0178, lon: 72.8397 },
    durationMin: 120,
    pricePerPerson: { minor: 45000, currency: "INR" },
    capacity: 8,
    hours: { raw: "Tu-Su 11:00-19:00", status: "ok", lastVerified: "2026-09-01" },
    indoorOutdoor: "indoor",
    accessibility: { ...allTrue, hearingLoop: true },
    kidFriendly: true,
    minAge: 6,
    diets: ["vegetarian"],
    cuisines: [],
    rating: { value: 4.8, count: 87, rawMean: 4.9 },
    blurb: "Two hours at the wheel with a kumbhar potter. Aprons provided, sleeves not.",
    description:
      "A working pottery studio in Dharavi. Wheel-throwing, no prior experience needed, and the pieces get fired and posted to you.",
    keywords: ["pottery", "kumbhar", "dharavi", "craft", "workshop", "clay"],
    perception: {
      landscape: ["studio", "kiln"],
      activities: ["wheel throwing", "making"],
      atmosphere: ["focused", "warm"],
    },
    bestTimeOfDay: ["afternoon"],
    requiresJourney: false,
    booking: { required: true, leadTimeMin: 2880, walkIn: false },
    bestMonths: [1, 2, 3, 4, 10, 11, 12],
    weatherSensitive: "none",
    provenance: {
      durationMin: "provider",
      pricePerPerson: "provider",
      accessibility: "provider",
      capacity: "provider",
    },
    providerId: "prov_kumbharwada_01",
    neighbourhood: "Dharavi",
    city: "Mumbai",
  }),
  experience({
    id: "exp_cafe_05",
    name: "Kala Ghada Cafe",
    category: "cafe",
    location: { lat: 18.9291, lon: 72.8321 },
    durationMin: 45,
    pricePerPerson: { minor: 32000, currency: "INR" },
    capacity: 20,
    // `unparsable`, not `ok`. Hours exist but we cannot evaluate them, and the
    // card says so rather than pretending the place is open.
    hours: { raw: "Mo-Su 08:00-23:00 PH off", status: "unparsable", lastVerified: null },
    indoorOutdoor: "indoor",
    accessibility: { ...allTrue, seatingAvailable: true },
    kidFriendly: true,
    minAge: null,
    diets: ["vegetarian", "vegan"],
    cuisines: ["cafe"],
    rating: { value: 4.2, count: 640, rawMean: 4.18 },
    blurb: "Small, quiet, and the only place on that stretch with a ramp.",
    description: "Eight tables, a step-free entrance, and a reliably cold filter coffee.",
    keywords: ["cafe", "coffee", "vegetarian", "quiet", " ramp"],
    perception: {
      landscape: ["indoor", "high ceilings"],
      activities: ["eating", "reading"],
      atmosphere: ["quiet", "calm"],
    },
    bestTimeOfDay: ["morning", "afternoon"],
    requiresJourney: false,
    booking: { required: false, leadTimeMin: 0, walkIn: true },
    bestMonths: [],
    weatherSensitive: "none",
    provenance: { hours: "osm", accessibility: "curated" },
    providerId: null,
    neighbourhood: "Fort",
    city: "Mumbai",
  }),
  experience({
    id: "exp_koli_06",
    name: "Koli fishing village walk, Versova",
    category: "community_hosted",
    location: { lat: 19.1312, lon: 72.8087 },
    durationMin: 105,
    pricePerPerson: { minor: 80000, currency: "INR" },
    capacity: 10,
    hours: { raw: "Mo-Fr 05:30-09:00", status: "ok", lastVerified: "2026-08-20" },
    indoorOutdoor: "outdoor",
    accessibility: { ...unknownAccess, stepFree: false, lowStairs: true },
    kidFriendly: true,
    minAge: 8,
    diets: [],
    cuisines: ["seafood"],
    rating: { value: 4.7, count: 43, rawMean: 4.77 },
    blurb: "Out on the boats with a Koli family, then breakfast where the catch lands.",
    description:
      "Starts before dawn on the jetty. Not step-free and the jetty is wet, so it suits confident walkers.",
    keywords: ["koli", "fishing", "versova", "boats", "community", "seafood"],
    perception: {
      landscape: ["harbour", "jetty", "sea"],
      activities: ["boating", "fishing", "eating"],
      atmosphere: ["working", "communal"],
    },
    bestTimeOfDay: ["early_morning"],
    requiresJourney: true,
    booking: { required: true, leadTimeMin: 1440, walkIn: false },
    bestMonths: [11, 12, 1, 2, 3],
    weatherSensitive: "any",
    provenance: { durationMin: "provider", pricePerPerson: "curated", description: "inferred" },
    providerId: "prov_koli_versova_01",
    neighbourhood: "Versova",
    city: "Mumbai",
  }),
];

/* ==========================================================================
   CONTEXT
   The PS's own example, from README: three hours, a hotel in Colaba, four
   people, one a toddler, ₹1,500, it might rain, an older relative who cannot
   manage stairs.
   ========================================================================== */

export const FIXTURE_CONTEXT: DiscoveryContext = {
  id: "ctx_demo_01",
  origin: { label: "Hotel in Colaba", point: { lat: 18.9167, lon: 72.8333 } },
  availableMin: 180,
  nowMin: 570,
  budget: { minor: 150000, currency: "INR" },
  budgetPerPerson: null,
  partySize: 4,
  partyType: "family_with_children",
  childAges: [3],
  accessNeeds: ["lowStairs"],
  diets: [],
  interests: ["local", "craft"],
  avoid: ["crowded"],
  weather: { condition: "cloudy", tempC: 29, source: "simulated" },
  travelMode: "any",
  requests: [],
  excludedIds: [],
  pinnedIds: [],
  original: {
    availableMin: 180,
    budget: { minor: 150000, currency: "INR" },
    partySize: 4,
    accessNeeds: ["lowStairs"],
  },
};

/* ==========================================================================
   FITS, SCORES, REJECTIONS
   ========================================================================== */

function fit(input: unknown): Fit {
  return Fit.parse(input);
}

function score(input: unknown): ScoreBreakdown {
  return ScoreBreakdown.parse(input);
}

function rejection(input: unknown): Rejection {
  return Rejection.parse(input);
}

export const FIXTURE_FITS: Record<string, Fit> = {
  "exp_kala ghoda_01": fit({
    experienceId: "exp_kala ghoda_01",
    travelMin: 12,
    activityMin: 75,
    bufferMin: 15,
    totalMin: 102,
    availableMin: 180,
    fitRatio: 1.76,
    cost: { minor: 0, currency: "INR" },
    budget: { minor: 150000, currency: "INR" },
    checks: [
      { label: "Travel time", pass: true, detail: "12 min from Colaba" },
      { label: "Opening hours", pass: true, detail: "Open until 20:00" },
      { label: "Low stairs", pass: true, detail: "Flat street" },
      { label: "Budget", pass: true, detail: "Free" },
    ],
    verdict: "fits",
  }),
  exp_sea_shell_03: fit({
    experienceId: "exp_sea_shell_03",
    travelMin: 18,
    activityMin: 60,
    bufferMin: 15,
    totalMin: 93,
    availableMin: 180,
    fitRatio: 1.94,
    cost: { minor: 0, currency: "INR" },
    budget: { minor: 150000, currency: "INR" },
    checks: [
      { label: "Travel time", pass: true, detail: "18 min by auto" },
      { label: "Opening hours", pass: true, detail: "Open 24h" },
      { label: "Low stairs", pass: true, detail: "Flat promenade" },
    ],
    verdict: "fits",
  }),
  // `tight`, not `does_not_fit`: 172 of 180 is eight minutes of slack, which
  // deserves a warn hairline rather than the alarm colour.
  exp_pottery_04: fit({
    experienceId: "exp_pottery_04",
    travelMin: 35,
    activityMin: 120,
    bufferMin: 17,
    totalMin: 172,
    availableMin: 180,
    fitRatio: 1.05,
    cost: { minor: 180000, currency: "INR" },
    budget: { minor: 150000, currency: "INR" },
    checks: [
      { label: "Travel time", pass: true, detail: "35 min to Dharavi" },
      { label: "Duration", pass: true, detail: "120 min on site" },
      { label: "Budget", pass: false, detail: "₹1,800 for four, over your ₹1,500" },
      { label: "Booking", pass: true, detail: "Booked, 2 days' notice given" },
    ],
    verdict: "tight",
  }),
  // A genuine near-miss. Still rendered, de-emphasised, reason inline.
  exp_koli_06: fit({
    experienceId: "exp_koli_06",
    travelMin: 52,
    activityMin: 105,
    bufferMin: 15,
    totalMin: 172,
    availableMin: 120,
    fitRatio: 0.7,
    cost: { minor: 320000, currency: "INR" },
    budget: { minor: 150000, currency: "INR" },
    checks: [
      { label: "Travel time", pass: true, detail: "52 min to Versova" },
      { label: "Duration", pass: false, detail: "Needs 52 min more than you have left" },
      { label: "Budget", pass: false, detail: "₹3,200 for four" },
      { label: "Low stairs", pass: false, detail: "Wet jetty, not step-free" },
    ],
    verdict: "does_not_fit",
  }),
  exp_cafe_05: fit({
    experienceId: "exp_cafe_05",
    travelMin: 10,
    activityMin: 45,
    bufferMin: 10,
    totalMin: 65,
    availableMin: 180,
    fitRatio: 2.77,
    cost: { minor: 128000, currency: "INR" },
    budget: { minor: 150000, currency: "INR" },
    checks: [
      { label: "Opening hours", pass: true, detail: "Hours unverified — treat as closed" },
      { label: "Low stairs", pass: true, detail: "Step-free entrance" },
    ],
    verdict: "fits",
  }),
  exp_dharmashala_02: fit({
    experienceId: "exp_dharmashala_02",
    travelMin: 30,
    activityMin: 90,
    bufferMin: 15,
    totalMin: 135,
    availableMin: 180,
    fitRatio: 1.33,
    cost: { minor: 240000, currency: "INR" },
    budget: { minor: 150000, currency: "INR" },
    checks: [
      { label: "Low stairs", pass: false, detail: "Steep, with no step-free route" },
      { label: "Budget", pass: false, detail: "₹2,400 for four" },
    ],
    verdict: "does_not_fit",
  }),
};

export const FIXTURE_SCORES: Record<string, ScoreBreakdown> = {
  "exp_kala ghoda_01": score({
    experienceId: "exp_kala ghoda_01",
    total: 0.82,
    components: [
      { key: "categoryFit", label: "Matches what you asked for", value: 0.31, weight: 0.9, reason: "Market, and you said local" },
      { key: "proximity", label: "Close to where you are", value: 0.22, weight: 0.8, reason: "1.2 km from your hotel" },
      { key: "price", label: "Fits the budget", value: 0.18, weight: 0.7, reason: "Free" },
      { key: "accessibility", label: "Low stairs", value: 0.11, weight: 1.0, reason: "Flat street" },
      { key: "crowd", label: "Not too crowded", value: -0.06, weight: 0.5, reason: "Busy after 18:00" },
      { key: "rating", label: "Rating", value: 0.06, weight: 0.4, reason: "4.4 from 1,284" },
    ],
    profileVersion: "wp_1.2.0",
    // The learned components are marked in the UI, because a recommendation
    // you cannot interrogate is just a vibe.
    learnedComponents: ["crowd"],
  }),
  exp_sea_shell_03: score({
    experienceId: "exp_sea_shell_03",
    total: 0.77,
    components: [
      { key: "categoryFit", label: "Matches what you asked for", value: 0.24, weight: 0.9 },
      { key: "proximity", label: "Close to where you are", value: 0.26, weight: 0.8, reason: "2.1 km" },
      { key: "accessibility", label: "Low stairs", value: 0.14, weight: 1.0, reason: "Flat the whole way" },
      { key: "price", label: "Fits the budget", value: 0.18, weight: 0.7, reason: "Free" },
      { key: "novelty", label: "New to you", value: 0.09, weight: 0.3 },
      { key: "rating", label: "Rating", value: 0.02, weight: 0.4, reason: "Only 3 reviews" },
    ],
    profileVersion: "wp_1.2.0",
    learnedComponents: ["novelty"],
  }),
  exp_pottery_04: score({
    experienceId: "exp_pottery_04",
    total: 0.64,
    components: [
      { key: "categoryFit", label: "Matches what you asked for", value: 0.28, weight: 0.9, reason: "Craft, and you said craft" },
      { key: "localAuthenticity", label: "Local character", value: 0.19, weight: 0.8, reason: "A working studio, not a shop" },
      { key: "kidFriendly", label: "Works with a 3-year-old", value: 0.15, weight: 0.9 },
      { key: "accessibility", label: "Low stairs", value: 0.09, weight: 1.0 },
      { key: "price", label: "Fits the budget", value: -0.14, weight: 0.7, reason: "₹300 over your limit for four" },
    ],
    profileVersion: "wp_1.2.0",
    learnedComponents: ["localAuthenticity"],
  }),
  exp_koli_06: score({
    experienceId: "exp_koli_06",
    total: 0.31,
    components: [
      { key: "localAuthenticity", label: "Local character", value: 0.29, weight: 0.8 },
      { key: "categoryFit", label: "Matches what you asked for", value: 0.12, weight: 0.9 },
      { key: "price", label: "Fits the budget", value: -0.22, weight: 0.7, reason: "₹1,700 over for four" },
      { key: "accessibility", label: "Low stairs", value: -0.18, weight: 1.0, reason: "Not step-free" },
      { key: "duration", label: "Fits your window", value: -0.14, weight: 0.9 },
    ],
    profileVersion: "wp_1.2.0",
    learnedComponents: [],
  }),
};

/**
 * The "why not that" set. These messages are the product thesis in sentence
 * form — a finished sentence with a real number in it, never "constraint
 * violated". The 25 canonical messages for every RejectionCode are Vishwesh's
 * `content/` work (TASKS.md); these are the demo subset.
 */
export const FIXTURE_REJECTIONS: Rejection[] = [
  rejection({
    experienceId: "exp_koli_06",
    code: "duration_exceeds_budget",
    message: "Needs 52 min more than you have left. You have 2h, this needs 2h 52m including the drive out to Versova.",
    shortfall: 52,
    unit: "minutes",
    relaxable: true,
  }),
  rejection({
    experienceId: "exp_dharmashala_02",
    code: "no_low_stairs",
    message: "The walk is steep and has no step-free route, and you asked for low stairs.",
    shortfall: null,
    unit: null,
    relaxable: false,
  }),
  rejection({
    experienceId: "exp_dharmashala_02",
    code: "over_budget",
    message: "₹900 over your budget. The guided walk is ₹2,400 for four against your ₹1,500.",
    shortfall: 90000,
    unit: "minor_units",
    relaxable: true,
  }),
  rejection({
    experienceId: "exp_cafe_05",
    code: "hours_unverified",
    message: "Opening hours have never been verified, so we cannot promise a table. Worth a phone call.",
    shortfall: null,
    unit: null,
    relaxable: false,
  }),
];

/* ==========================================================================
   PLAN
   ========================================================================== */

function leg(input: unknown): TravelLeg {
  return TravelLeg.parse(input);
}

function planStop(input: unknown): PlanStop {
  return PlanStop.parse(input);
}

export const FIXTURE_PLAN: Plan = Plan.parse({
  id: "plan_demo_01",
  contextId: FIXTURE_CONTEXT.id,
  stops: [
    planStop({
      experienceId: "exp_kala ghoda_01",
      arriveMin: 585,
      departMin: 660,
      fit: FIXTURE_FITS["exp_kala ghoda_01"],
      score: FIXTURE_SCORES["exp_kala ghoda_01"],
      why: [
        "Free, and the market is open until 20:00",
        "1.2 km from your hotel, so almost no travel",
        "Flat street, which is what you asked for with a 3-year-old",
      ],
      order: 0,
    }),
    planStop({
      experienceId: "exp_pottery_04",
      arriveMin: 715,
      departMin: 835,
      fit: FIXTURE_FITS["exp_pottery_04"],
      score: FIXTURE_SCORES["exp_pottery_04"],
      why: [
        "A working studio rather than a shop, which is the local character you asked for",
        "Two hours at the wheel, and a 3-year-old can help",
        "₹300 over your budget for four people",
      ],
      order: 1,
    }),
  ],
  legs: [
    leg({
      fromId: "exp_kala ghoda_01",
      toId: "exp_pottery_04",
      mode: "auto",
      minutes: 35,
      metres: 11200,
      detail: "via Mahim Causeway",
      estimated: true,
    }),
  ],
  totalMin: 260,
  totalCost: { minor: 180000, currency: "INR" },
  // 260 / 300 available = 0.867, above the 0.85 bar the eval set expects.
  utilisation: 0.867,
  totalMetres: 11200,
  rejected: FIXTURE_REJECTIONS,
  relaxations: [],
  stressScore: 44,
  stressFactors: [
    { dimension: "overload", weight: 0.25, value: 18, rescue: null },
    { dimension: "pinDebt", weight: 0.18, value: 62, rescue: "Drop the pottery booking and put a free street-food stop in its place — it saves ₹1,800 and the 3-year-old will still be busy." },
    { dimension: "weatherRisk", weight: 0.14, value: 71, rescue: null },
    { dimension: "fomoRisk", weight: 0.13, value: 22, rescue: null },
    { dimension: "spreadRisk", weight: 0.12, value: 55, rescue: null },
    { dimension: "transitComplexity", weight: 0.1, value: 12, rescue: null },
    { dimension: "reservationRisk", weight: 0.08, value: 40, rescue: null },
  ],
  createdAt: "2026-09-26T09:30:00.000Z",
  engineVersion: "engine_0.1.0",
});

/* ==========================================================================
   WEIGHTS
   ========================================================================== */

/**
 * `source: "prior"` and a small observation count, so the "what I learned
 * about you" panel opens in its honest state: these are starting values, not
 * conclusions about the traveller.
 */
export const FIXTURE_WEIGHTS: WeightProfile = WeightProfile.parse({
  version: "wp_1.2.0",
  weights: {
    categoryFit: 0.9,
    proximity: 0.8,
    price: 0.7,
    accessibility: 1.0,
    localAuthenticity: 0.8,
    kidFriendly: 0.9,
    novelty: 0.3,
    crowd: 0.5,
    rating: 0.4,
  },
  source: "prior",
  updatedAt: "2026-09-26T09:30:00.000Z",
  observations: 0,
});

/* ==========================================================================
   LOOKUPS
   ========================================================================== */

/** The six "reality changed" triggers from docs/FEATURES.md §3. */
export const CONTEXT_TRIGGERS = [
  { key: "rain", label: "It started raining", detail: "Outdoor loses, indoor wins" },
  { key: "time", label: "We lost 90 minutes", detail: "Fewer stops, closer" },
  { key: "soldout", label: "This one's sold out", detail: "Find a replacement" },
  { key: "budget", label: "Budget is now ₹600", detail: "Prune and show what was cut" },
  { key: "restroom", label: "Need a bathroom", detail: "Filter to on-site" },
  { key: "exhausted", label: "We're exhausted", detail: "Fewer transfers, longer dwell" },
] as const;
