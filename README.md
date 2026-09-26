# TravelBuddy (Ananta)

> **Don't optimise for places. Optimise for moments.**

An intelligent local discovery and experience platform for **time-constrained
travellers** — and an acquisition channel for the local providers they want to
reach.

Built for **PS ID 6 — Local & Experiences: Intelligent Local Discovery &
Experience Platform**. Research codename: ATHITI.

---

## Status — read this first

This repository is being built by three people in three parallel streams
(see [Team](#team)). **The UI/UX stream is implemented. The engine, data and
LLM streams are not yet.** Nothing in this README describes the whole system as
working, because it does not yet.

| Area | State | What that means in practice |
|---|---|---|
| `src/styles/**`, `src/components/**` | **Implemented** | Design tokens, all 12 primitives from the design system's inventory plus 5 the spec's own requirements implied, the signature fit components, the map wrapper |
| `src/app/**` | **Implemented** | Discovery surface, plan timeline, replanner panel, chat sidecar, API routes |
| `src/engine/**` | Not implemented | Retrieval, feasibility, scoring, packing, validation, replanning |
| `src/data/**`, `src/db/**` | Not implemented | OSM harvest, curation, catalogue, database |
| `src/llm/**` | Not implemented | Intent parsing, narration, enrichment |
| `src/features/**` | Not implemented | Provider side, unmet-demand feed, context editor feature logic |
| `tests/**`, `scripts/eval.ts` | Not implemented | Unit tests and the eval table |

**The running app is backed by fixtures, not by the engine.** Every response
says so: the API returns an `x-engine: fixtures` header and the UI shows a
"Fixtures, engine pending" badge. This is deliberate — a demo that quietly
served static data while appearing live would be the one dishonest thing this
product could do, and the seam is built so the app switches to the real engine
with no code change when it lands. See [Engine seam](#engine-seam).

The Quick Start below is accurate. Several scripts referenced by the original
plan (`db:seed`, `db:harvest`, `db:embed`, `eval`, `test`) point at files that
do not exist yet and **will fail**; they are left in `package.json` because they
belong to another stream.

---

## The problem, and our answer

A traveller in Mumbai has three hours and a hotel in Colaba. Four people, one a
toddler, ₹1,500, it might rain, and an older relative who cannot manage stairs.

Every discovery tool returns a ranked list that ignores at least one of those.
Half of it is closed, the good places are forty minutes away in traffic, none of
it is step-free, the ₹800 tasting menu blows the budget, and the kid-friendly
options are six kilometres away.

And the same failure runs the other way: the local potter, the Koli fishing
community, the Textile Museum guide — none of them can reach a traveller who is
standing two kilometres away and would love what they do.

Both are one problem. There is no shared, structured, timely representation of
**what fits whom, where, and when**.

## What we do differently

**A recommendation must fit, or it is not shown.**

```
context → retrieve → FEASIBILITY GATE → score → pack → validate → relax
```

The gate is twelve hard constraints: travel time, duration, opening hours,
budget, capacity, group fit, accessibility, weather, availability, distance,
season, duplicates. Anything that fails is dropped **with a recorded reason** —
a finished sentence with a real number in it.

That record does two jobs. It becomes the traveller's *"why not that"* panel. And
aggregated per neighbourhood, it becomes the provider's **unmet-demand feed**:
what people nearby searched for and could not get, and which single constraint
killed them. That is the answer to the provider half of the problem statement.

**This repository implements the reading end of that thesis.** The writing end
needs the engine.

---

## Features (implemented)

Everything below renders values from the frozen contract and **computes none of
them**. `src/contracts/index.ts` is the only shared surface between the three
streams, which is what makes the parallelism safe.

### The signature: the feasibility meter

The thesis is *"this actually fits"*, and the meter is the one place boldness is
spent. It renders `Fit` directly — activity, travel and buffer as three
proportional segments against the traveller's remaining window, with the
overflow past 100% in the alarm colour.

It **fills and goes red** as an option stops fitting, animated on a dedicated
overshoot curve. This is the only place motion is load-bearing: the user is
watching a number cross a threshold, so the animation *is* the feedback. A
`tight` verdict gets a warning hairline, never red — if everything slightly over
budget were red, red would stop meaning anything.

### Why this, and why not that

The dual ledger, and the second half is the feature nobody else has:

- **Why this** — the engine's own ranked sentences, with learned weights marked
  as learned, and the full arithmetic one tap away.
- **Why not that** — for anything that did not appear, the specific
  `Rejection` message **verbatim**: a finished sentence with the real number
  already in it. Never "constraint violated".

Recovery actions are only offered when the rejection is marked `relaxable`.
Offering "add 40 minutes" for something no amount of time would fix turns a
helpful panel into a nuisance.

### The rest of the surface

| Component | Notes |
|---|---|
| `ResultCard` | Verdict first, then name, data, rating, blurb, provenance, accessibility, action. A card that does not fit is still rendered, de-emphasised, with the blocking reason inline — the near-miss is what tells you what to change |
| `TimeBudgetBar` | Masked into real 30-minute blocks, so "2h budget" is literally four blocks you can count. Overrun is hatched, because a solid red block reads as *more* budget |
| `TravelConnector` | A hairline **sibling** of the stop list, not a property of a stop, so a screen reader hears the walk *between* two places. Estimated legs say so |
| `StressRadar` | Seven weighted dimensions, labels breaking at 68 and 38 only, and exactly **one** rescue sentence for the worst factor |
| `MapCanvas` + `ClusterLayer` | MapLibre over OpenFreeMap. No API key, no account. Card click reveals the point in its cluster, and spiderfies it if the area is denser than the zoom range resolves |
| `LearnedWeights` | Shows the weights, marks which are learned rather than stated, and prints the observation count — "learned from 4 interactions" and "learned from 400" are very different claims |
| `EmptyState` | Zero-result copy is cause-branched with a way out, and a dead end with no action is treated as a bug |
| `ChatSidecar` | Streaming over SSE, suggestion chips, and a `confidence` gate below which it asks instead of acting |
| `AccessibilityControls` | Per-tier font scaling, theme, and reduced motion, applied before first paint |

### Primitives

All twelve from `DESIGN_SYSTEM §3` are implemented: `Button`, `Card`, `Badge`,
`Popover`, `Sheet`, `Dialog`, `Tooltip`, `Toggle`, `Slider`, `SegmentedControl`,
`Skeleton`, `EmptyState`.

Five more exist because the spec's own requirements implied them and did not name
them:

- **`Disclosure`** — `inert` plus a `grid-rows` collapse. Collapsing with
  `max-height` or `display: none` leaves content in the tab order, so keyboard
  focus walks into controls the user cannot see. Three separate components need
  this done correctly, which is why it is one primitive rather than three
  copies.
- **`FactPill`** — accessibility as yes / no / **unknown**, with a glyph and a
  word. The negatives are the decision-grade information, and colour alone hides
  them from a colourblind reader. `unknown` is a real third state rather than a
  false, because the contract models these as nullable precisely because OSM's
  `wheelchair` tag is 3-state — a provider who has not been surveyed has not
  said no.
- **`CardHeader`** / **`CardDivider`** — so nobody hand-rolls a border colour.

---

## Technical approach

**TypeScript only.** Next.js 15.5 · React 19.2 · Tailwind v4 (CSS-first) ·
MapLibre with OpenFreeMap.

Three decisions are worth stating up front.

### Tokens are the only place a colour is written

`src/styles/tokens.css` is split into three layers on purpose:

```
raw       the only place a hex may appear
semantic  what a token MEANS
@theme    Tailwind v4 emits utilities from these names
```

Dark mode swaps the **raw** layer; the semantic layer does not move. That is why
no component anywhere in the app has a dark-mode branch for colour.

### The design system is enforced, not documented

A design system without a gate is a mood board. Four checks run in CI, and each
one exists because running it found something:

| Gate | Enforces |
|---|---|
| `npm run theme:lint` | No hex or functional colour literal outside `tokens.css`; no off-scale z-index; no `transition: all`; no banned typeface; no `rounded-full` on a container; and no reference to a token that does not exist |
| `npm run copy:lint` | No emoji, no banned filler words, no colon reveals, no three-dot ASCII ellipsis — walked via the TypeScript AST, so user-visible copy is found *syntactically* rather than by grepping |
| `npm run contrast:lint` | Every token pair, in **both** themes, at WCAG AA |
| `npm run lint` | ESLint, including the React hooks rules |

Two of these caught real defects in the project's own design system, which is
the argument for having them:

- **`warn` and `ink-faint` failed the spec's own contrast rule.** The token table
  in `DESIGN_SYSTEM §2` lists values that measure 4.25:1 and 2.74:1 on canvas;
  `§5` requires 4.5:1 for a semantic colour used *as text*. Corrected in
  `tokens.css` with the reasoning inline. `ink-faint` additionally became
  decoration-only, because darkening it to 4.5:1 would put it within 0.28 of
  `ink-muted` and collapse three text tiers into two indistinguishable ones.
- **A copy-lint rule banned the design system's own recommended string.** The
  colon-reveal rule initially matched a phrase without requiring the colon, so it
  flagged *"Nothing fits all your constraints. Here is what gives."* A rule that
  bans the spec's own copy is worse than no rule, because it forces a change to
  a worse sentence.

### Contract violations fail loudly

Fixtures are parsed with the contract's **own zod schemas** at module load, and
API routes `safeParse` their input. A value that violates the frozen contract
throws with a field path instead of rendering `undefined` three components deep.
That is the enforcement mechanism for "the contract is frozen", from the
consuming side — the contract is a runtime gate, not just a type.

---

## Architecture

### The one integration point

```
src/contracts/index.ts     FROZEN. zod schemas every stream codes against
        │
        ├── src/engine/**  src/data/**  src/db/**   Abhijit  (not yet written)
        ├── src/components/**  src/app/**  src/styles/**   Karan  ← this branch
        └── src/features/**  src/llm/**  content/**   Vishwesh  (not yet written)
```

Nobody redefines a type locally, and nobody writes into another owner's
directory. If a field must change, it changes in the contract, in a commit, and
the other two rebase.

### Engine seam

`src/app/_lib/engine.ts` is the only module that knows the engine might be
absent. It tries a dynamic import of `@/engine` and, if that fails, returns
fixtures **and says why**. Three consequences:

- The app switches to the real engine with **no edit** when it lands.
- A partial engine fails loudly on the first request — `loadEngine()` checks
  that all eleven published functions exist, because an engine that fails halfway
  through producing an answer is worse than none.
- The stub state is **visible** in the `x-engine` response header and in the UI.

`engine-seam.d.ts` and `llm-seam.d.ts` are ambient declarations that exist only
so a dynamic import of a not-yet-written module can typecheck. **Both are marked
for deletion the day the real modules land.**

### API

| Route | Purpose |
|---|---|
| `POST /api/discover` | Validate a `DiscoveryContext`, return a `Plan` |
| `PUT /api/discover` | Apply a `ContextChange`, return the replan and its **swap diff** |
| `POST /api/chat` | Streaming SSE sidecar, emitting a validated `DialogueDecision` |

Chat's blast radius is structural, not conventional: `DialogueDecision` is
`.strict()` and its `contextPatch` has no field capable of carrying a
recommendation or a reordering. The model cannot edit a plan even if it tried,
because there is nowhere to put it.

---

## Setup

**Requires Node 22+.**

```bash
# The committed package-lock.json currently has 23 entries with no `version`
# field, which makes `npm ci` abort with "Invalid Version:". Installing without
# it leaves the lockfile untouched. Regenerating it is a separate fix.
npm install --no-package-lock

# esbuild's postinstall is blocked by default and tsx needs it.
npm install-scripts approve esbuild

npm run dev            # http://localhost:3000
```

The map needs a network connection for OpenFreeMap tiles. Everything else runs
offline; there is no API key anywhere in the project.

### Scripts that work

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run theme:lint` | Token gate (`--watch` for instant feedback) |
| `npm run copy:lint` | Copy gate |
| `npm run contrast:lint` | Contrast gate |

### Scripts that do not work yet

`npm test`, `npm run eval`, `npm run db:seed`, `npm run db:harvest`,
`npm run db:embed` — all point at files owned by another stream that have not
been written. They are left in place rather than removed so the other streams
have their entry points.

---

## Testing

There is no unit-test suite yet; `tests/**` belongs to the engine stream. What
exists is a set of executable gates, all of which run in CI on every push:

```
typecheck      tsc --noEmit, strict + noUncheckedIndexedAccess
lint           ESLint 9 flat config, React hooks rules on
theme:lint     token gate — no colour literal outside tokens.css
copy:lint      copy gate — no emoji, filler, or colon reveals
contrast:lint  34 token pairs, both themes, WCAG AA
build          next build
```

Each lint was verified against a planted violation to confirm it actually fails,
because a linter that never fails is worse than none. Contrast covers 34 pairs
across light and dark.

Manually verified at runtime: server-rendered page, `POST /api/discover`
returning the honest `x-engine` header, `PUT` replan returning a one-swap diff
with `preservedIntent: true`, a contract violation returning 422 with field
paths, and the chat stream still distinguishing *"we lost 60 minutes"* (a
subtraction) from *"we have 2 hours"* (an assignment).

**Not verified:** pixel-level layout at 360px and 1440px. No browser is
installed, and adding one is a dependency decision the project defers to the
group. Statically the layout collapses to a single column below 64rem, there are
no fixed pixel widths, and the built CSS emits both breakpoints plus the
reduced-motion and colour-scheme media queries — but that is not the same as
looking at it.

---

## Team

Three people, three streams, **zero file overlap**.

| | Owns | State |
|---|---|---|
| **Abhijit** | Data, engine, ML. `src/engine/`, `src/data/`, `src/db/`, `tests/` | Contracts published; implementation pending |
| **Karan** | UI/UX. `src/components/`, `src/app/`, `src/styles/` | **This branch** |
| **Vishwesh** | Features, provider side, LLM. `src/features/`, `src/llm/`, `content/` | Contracts published; implementation pending |

The three streams only meet at `src/contracts/index.ts`, which is **frozen**.
That is what makes the parallelism safe — see [`TASKS.md`](TASKS.md).

---

## Research

We studied **71 pinned reference repositories** and about 15,000 lines of
evidence-graded notes. It is not decoration: several of our decisions reverse
what the source material claims, because we read the code rather than the
abstract.

`research/findings/02-engine-internals.md` catalogues **27 claims from READMEs,
papers and file names that did not survive checking.** Three were load-bearing in
an earlier masterplan of ours:

- The Z3 "unsat core" relaxation we were planning to adopt **does not exist** in
  the reference implementation — `unsat_core()` is called on a solver with zero
  tracked assumptions, so it always returns empty, and the `minimize`/`maximize`
  on one `Optimize` object is lexicographic, so the penalty is lowest-priority and
  the relaxation is silently defeated.
- The spatial-optimisation stage of the paper we were citing raises `NameError`
  on a missing import, so it never runs.
- OR-Tools' routing library appears in **none** of the 71 repos, and there is no
  Node binding for it at all.

That is why the engine is meant to be hand-written TypeScript instead of a
solver.

The UI decisions are sourced the same way, and each non-obvious one is
commented at its call site with the file and line it came from — the travel
connector, the masked block bar, the per-tier type scale, the HTML cluster
counts, the accessibility pills. Start at
[`research/findings/00-SYNTHESIS.md`](research/findings/00-SYNTHESIS.md) and
[`research/findings/01-traveler-uiux.md`](research/findings/01-traveler-uiux.md).

## Data provenance and licensing

| Layer | Source | Licence |
|---|---|---|
| Map backbone | OpenStreetMap via OpenFreeMap tiles | **ODbL** — attribution required |
| Experience catalogue | Hand-curated fixtures for now | Ours |
| Routing, weather | Not yet called | Keyless public endpoints |
| Photos | Not yet integrated | **CC** — per-image attribution required |

We **do not scrape Google Maps, Instagram, Zomato or TripAdvisor.** It would fill
our ratings gap and it breaches their terms.

---

## Documentation

| Document | What it is | State |
|---|---|---|
| [`TASKS.md`](TASKS.md) | The three-way split, file ownership, day-by-day | Current |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Tokens, components, copy, accessibility | **Implemented** — with two documented corrections |
| [`src/styles/tokens.css`](src/styles/tokens.css) | The token layer, in three layers | Implemented |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Modules, data model, algorithms | Design |
| [`docs/MASTERPLAN.md`](docs/MASTERPLAN.md) | The whole thing, decisions locked | Design |
| [`docs/PRD.md`](docs/PRD.md) | Requirements, acceptance criteria, risks | Design |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Contested questions, resolved, with evidence | Design |
| [`docs/DATA_SPEC.md`](docs/DATA_SPEC.md) | Data layers, OSM tag semantics, harvest | Design |
| [`docs/FEATURES.md`](docs/FEATURES.md) | Feature-by-feature acceptance criteria | Design |
| [`docs/EVAL_SPEC.md`](docs/EVAL_SPEC.md) | The eval scenarios and metrics | Design |
| [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) | The 3-minute script | Design |
| [`docs/PRESENTATION.md`](docs/PRESENTATION.md) | Internal round prep | Internal |

Documents marked *Design* describe intended behaviour. Where this README and a
design document disagree, **this README is correct**, because it is the one that
has been built.
