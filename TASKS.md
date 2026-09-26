# TASKS — three streams, zero file overlap

> The whole point of this file is that Abhijit, Karan and Vishwesh never block
> each other. That only works if (a) nobody shares a file, and (b) everybody
> codes against the same frozen interfaces.

---

## The two rules

**Rule 1 — `src/contracts/index.ts` is frozen.** It was written before anyone
started and it is the only shared surface. Import from it; never redefine a type
locally; never widen a type at the call site. If a field genuinely must change,
it changes in that file, in a commit, and the other two rebase.

**Rule 2 — if a path has an owner, only that person writes it.** The table below
is exhaustive. If you need something from someone else's path, you import it. If
it does not exist yet, you build against the contract and stub it — do not
create the file in their directory.

---

## File ownership map

Legend: **A** = Abhijit · **K** = Karan · **V** = Vishwesh · **—** = nobody (read-only, don't touch)

| Path | Owner | What lives there |
|---|:--:|---|
| `src/contracts/**` | — | **FROZEN.** zod schemas every stream codes against |
| `src/engine/**` | **A** | retrieve, feasibility, scoring, packer, validator, replanner, bandit, hours, travel, geo |
| `src/data/**` | **A** | harvest scripts, OSM normaliser, curation schema + seed data, embeddings, catalogue build |
| `src/db/**` | **A** | schema, migrations, repositories |
| `scripts/harvest-osm.ts` `scripts/embed.ts` `scripts/seed.ts` `scripts/eval.ts` | **A** | |
| `scripts/theme-lint.ts` `scripts/copy-lint.ts` `scripts/contrast-lint.ts` | **K** | the design-system gates. Already K's by the `src/styles/**` row above, which names "theme lint" — listed here so the path is not ambiguous |
| `tests/**` `vitest.config.ts` | **A** | engine unit tests + the eval harness. The vitest config follows `tests/**` |
| `tests/engine-seam.test.ts` | **K** | the UI-side engine contract test. Requested by the repo owner during PR review; it asserts the engine satisfies the seam, which is the UI's concern, though it lives in A's directory |
| `src/components/ui/**` | **K** | design-system primitives: Button, Card, Meter, Badge, Popover, Sheet, Skeleton, EmptyState |
| `src/components/map/**` | **K** | MapLibre wrapper, cluster layer, route line, card↔map coupling |
| `src/components/fit/**` | **K** | FitMeter, TravelConnector, TimeBudgetBar, StressRadar, WhyLedger, ScoreBreakdownList |
| `src/app/**` | **K** | pages, layouts, API route handlers, wiring |
| `src/styles/**` `tailwind.config.ts` `postcss.config.mjs` | **K** | tokens, type scale, theme lint |
| `src/features/**` | **V** | one folder per feature, each self-contained |
| `src/features/discovery/**` | **V** | context editor, replanner UI, chat sidecar |
| `src/features/provider/**` | **V** | listing editor, availability, request inbox, opportunity feed |
| `src/features/analytics/**` | **V** | provider dashboard, unmet-demand views |
| `src/llm/**` | **V** | OpenRouter client, NLU, narration, enrichment, guardrails |
| `content/**` `docs/FEATURES.md` `docs/DEMO_SCRIPT.md` | **V** | seed copy, eval scenarios, demo script, deck content |
| `docs/**` (everything else) | **A** | architecture, data spec, ML plan, eval spec, decisions |
| `README.md` | **A** | project overview and status. Already A's in the Day 7 row; listed here because the map previously omitted it |
| `package.json` `tsconfig.json` | **A** | dependencies. Adding one = a message to the group first |
| `src/lib/**` | **A** | shared utilities: money, time, id, env, logging |
| `research/**` | **A** | the 71 pinned reference repos and findings. Read-only for everyone else |

**`eslint.config.mjs` and the `lint` script have no owner, and we are not
inventing one.** ESLint spans all three streams rather than belonging to any of
them, and the `lint` script itself lives in `package.json`, which this file
already makes a group decision. Assigning it to whoever happened to write the
config would be worse than leaving it unassigned, because the next person would
read the map and assume it was settled. **This needs a group decision** — the
obvious candidates are "A, with the rest of the tooling" or "shared: any stream
may change it in a PR, no coordination needed". Either is defensible; what is not
defensible is leaving it ambiguous for a third cycle.

### The three integration points

Only three, all read-only for the non-owner, all typed by the contracts:

1. **Karan reads `Experience`, `Fit`, `Plan`, `PlanStop`, `TravelLeg`,
   `Rejection`, `ScoreBreakdown`.** Renders them. Never computes them.
2. **Vishwesh calls the engine's public functions** and passes their output
   straight to Karan's components. Never re-implements a check.
3. **Abhijit owns `src/contracts` changes only.** Everyone else files a request
   in standup.

---

## The engine's public API — so Vishwesh can build against it before it exists

Abhijit implements exactly this surface. Pure functions, no I/O, no LLM, no
`Date` objects. If you (Vishwesh or Karan) need something not on this list, ask
on Day 1 — do not go reading his internals.

```ts
// src/engine/index.ts
export function retrieve(input: RetrieveInput): Experience[];
export function filterFeasible(ctx: DiscoveryContext, items: Experience[]): FeasibleResult;
export function score(ctx: DiscoveryContext, items: Experience[], weights: WeightProfile): ScoreBreakdown[];
export function pack(ctx: DiscoveryContext, items: Experience[]): Plan;
export function validate(plan: Plan): ValidationResult;
export function replan(prev: Plan, ctx: DiscoveryContext, change: ContextChange): ReplanResult;
export function computeFit(ctx: DiscoveryContext, exp: Experience): Fit;
export function stress(plan: Plan, ctx: DiscoveryContext): { score: number; factors: Plan["stressFactors"] };

// hours + travel
export function isOpenDuring(hours: OpeningHours, fromMin: number, toMin: number, lat: number, lon: number): { open: boolean; status: "ok"|"partial"|"unparsable"|"absent" };
export function travelBetween(from: GeoPoint, to: GeoPoint, mode: TravelMode, atMin: number): TravelLeg;

// learning
export function observe(profile: WeightProfile, event: Interaction): WeightProfile;
```

Vishwesh's chat sidecar gets one more, from `src/llm`:

```ts
export function parseIntent(text: string, ctx: DiscoveryContext): Promise<DialogueDecision>;
export function narrate(plan: Plan, ctx: DiscoveryContext): Promise<string>;
```

`DialogueDecision` may only emit a patch to `DiscoveryContext`. That is the whole
allowed blast radius. Enforced by a test that fails the build if it widens.

---

## Day-by-day

### Day 1 — Contracts, freeze, and skeletons (all three, together, 2h standup)

| A | K | V |
|---|---|---|
| Publish `src/contracts` v1, tagged | Publish tokens + type scale | Read contracts, write eval scenarios |
| `src/lib/{money,time,id,env}.ts` | `tailwind.config.ts`, `src/styles/tokens.css` | `docs/FEATURES.md` — every feature + acceptance criteria |
| `src/engine/hours.ts` (adapter over npm `opening_hours`) | `src/components/ui/{Button,Card,Badge,Skeleton,EmptyState}` | 25–30 eval scenarios with expected-acceptable sets |
| `src/data/cities/mumbai/manifest.json` (bbox, monsoon months, congestion table) | `src/components/map/MapCanvas.tsx` — MapLibre + OpenFreeMap, verified | `src/llm/client.ts` — OpenRouter with fallback chain + circuit breaker |
| `scripts/harvest-osm.ts` — 3 mirrors, failover, cache, `out center` | | `src/llm/nlu.ts` — NL → DiscoveryContext, **plus a deterministic regex fallback** |

**End of Day 1 gate:** contracts are frozen, `npm run typecheck` is clean, and
all three have a running skeleton. Nobody is blocked.

### Day 2 — Engine core + the first real UI + NLU

| A | K | V |
|---|---|---|
| `travel.ts` — OSRM/Valhalla clients, caching, congestion multiplier, transit corridors | `FitMeter`, `TravelConnector`, `TimeBudgetBar` | Provider listing editor (fields per `Experience`) |
| `geo.ts` — haversine, isochrone client, cluster primitive | `ResultCard` — category, price, duration, rating, fit, provenance badge | Seed 60 experiences (Colaba, Fort, Marine Drive, Bandra) |
| `retrieve.ts` — FTS5 schema + query + tag facets | `MapListCoupling` — click card → `revealInCluster()` | `src/llm/narrate.ts` — why-this copy, template fallback first |
| `seed.ts` + DB schema + migrations | `styles/tokens.css` complete, dark mode, `theme:lint` script | First 8 eval scenarios running end-to-end |

### Day 3 — Feasibility, scoring, checkpoint #1

| A | K | V |
|---|---|---|
| `feasibility.ts` — the 12 hard checks, every drop emits a `Rejection` | `WhyLedger` — why this / why not that | Seed +60 more (100 total) |
| `scoring.ts` — scalarised, Bayesian ratings, penalty terms | `StressRadar` — 7 dimensions, labels at 68/38, one rescue move | Provider availability editor + slot model |
| `hours` adapter hardened: `PH off`, comments, garbage in → `unparsable` never a 500 | `Skeleton` set — 8 patterns, structural copy not a spinner | Booking request inbox + `BOOKING_TRANSITIONS` enforced in UI |
| **Standup: O1 — does provider ship or become stretch?** | | **Standup: O1** |

### Day 4 — Packing, validation, and the replanner

| A | K | V |
|---|---|---|
| `packer.ts` — clique peel, cluster order, 2-opt/Or-opt, LAHC | Plan timeline page — vertical, travel connectors between stops | Opportunity feed: unmet demand → provider suggestions |
| `validator.ts` — independent recompute, reject on delta > 1e-6 | Replanner UI — "reality changed" panel with the swap diff | Enrichment script: LLM infers duration/price/family-fit for OSM long tail |
| `bandit.ts` — Thompson sampling on weight profile | "What I learned about you" panel, editable | **Standup: O3 embeddings — ship or leave behind the interface** |
| `replanner.ts` — diff against `original`, minimal swaps | **Standup: O4 deploy target** | |

### Day 5 — Learning, chat, provider analytics

| A | K | V |
|---|---|---|
| `observe()` + preference refinement from the interaction stream | Chat sidecar — streaming SSE, suggestion chips | Chat wiring → `DialogueDecision` → context patch → replan |
| Embeddings behind the `Embedder` interface, if O3 says go | Accessibility pass — `inert` collapse, focus-visible, `prefers-reduced-motion` | Provider dashboard — impressions, requests, acceptance rate |
| Stress score implementation | Per-tier font scaling (`--fs-scale-*`) | Demo script dry run #1 |
| **Standup: O5 second city or deepen Mumbai** | | **Standup: O5** |

### Day 6 — Polish, hardening, deploy

| A | K | V |
|---|---|---|
| `scripts/eval.ts` — full table vs. the naive nearest-neighbour baseline | Responsive + a11y audit against `docs/DESIGN_SYSTEM.md` | Seed reviews, festival/event calendar |
| Offline OSM snapshot committed so the demo never needs the network | `theme:lint` enforced in CI | Content pass on all copy — no AI-slop patterns |
| LLM=off mode: eval must still pass | Map perf: cluster counts via `clusterProperties` | Deck content final |
| Deploy | Deploy | Deploy |

### Day 7 — Eval, docs, video, buffer

| A | K | V |
|---|---|---|
| Eval table green; the headline numbers for the deck | Screen-record the demo, 2–3 min, voiceover | Deck assembly |
| `README.md`, `docs/ARCHITECTURE.md`, licence + credits | Playwright e2e over the exact demo path | Final copy + copy pass |
| Buffer: whatever broke | Buffer | Buffer |

---

## Definition of done, per stream

**Abhijit — the engine is true**
- [ ] Every hard constraint emits a `Rejection` with a finished sentence
- [ ] 100% constraint satisfaction on the eval set, by construction
- [ ] Time utilisation > 85% across the eval set
- [ ] Validator catches a deliberately corrupted plan (negative test)
- [ ] Eval suite passes with `LLM=off`
- [ ] ≥ 250 curated records with provenance on every field
- [ ] Offline OSM snapshot committed

**Karan — the thesis is visible**
- [ ] Feasibility meter on every card, overflow in `alarm`
- [ ] Travel connector between every pair of stops
- [ ] Why-this and why-not-that both reachable in ≤ 2 taps
- [ ] Map↔list coupling: card click opens the cluster
- [ ] Zero hex literals outside `tokens.css`, enforced by `theme:lint`
- [ ] Keyboard-navigable, `prefers-reduced-motion` honoured, no emoji in code or copy
- [ ] 8 skeleton patterns, no layout shift

**Vishwesh — the loop closes**
- [ ] Provider can create a listing and define availability
- [ ] Request → confirm/decline, transitions enforced, capacity decrements
- [ ] Unmet-demand feed shows ≥ 3 actionable suggestions per seeded provider
- [ ] Chat turns free text into a context patch and a replan
- [ ] 25–30 eval scenarios authored with expected-acceptable sets
- [ ] Demo script dry-runs end to end

---

## Working agreements

- **Standup 15 min, 9:30 daily.** Say what is blocked, not what you did.
- **Merge daily, not at the end.** Small PRs, `main` must always typecheck.
- **Branch naming:** `feat/<your-initial>-<slug>` — `feat/a-clusterer`,
  `feat/k-fitmeter`, `feat/v-inbox`.
- **If you are blocked on another person's file, stub it against the contract**
  and tell them. Never write into their directory "just to unblock yourself".
- **Additions to `package.json` are group decisions.** Announce, wait for a
  thumbs-up, then add. This is how we avoid a 4000-package lockfile.
- **No scraping.** Not Google, not Instagram, not Zomato. Keyless public APIs
  and OSM only, and log which endpoint served what.
- **When you find a reference-repo claim is wrong, write it down** in your PR
  description. 27 such claims are already catalogued in
  `research/findings/02-engine-internals.md`; the next one we find is worth as
  much.
