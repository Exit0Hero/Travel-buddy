"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ContextChange,
  DiscoveryContext,
  Experience,
  Fit,
  Plan,
  Rejection,
  ScoreBreakdown,
  WeightProfile,
} from "@/contracts";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResultListSkeleton } from "@/components/ui/Skeleton";
import { SegmentedControl, Slider, Toggle } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Overlays";
import { LearnedWeights, ResultCard, WhyLedger } from "@/components/fit";

import { CONTEXT_TRIGGERS } from "../_fixtures";
import { ASK_ATHITI_EVENT } from "./narrative/AthitiNav";
import { AccessibilityControls } from "./AccessibilityControls";
import { ChatSidecar } from "./ChatSidecar";
import { MapPanel } from "./MapPanel";
import { PlanTimeline } from "./PlanTimeline";
import { RealityPanel } from "./RealityPanel";

export interface DiscoverySurfaceProps {
  initialPlan: Plan;
  context: DiscoveryContext;
  experiences: ReadonlyArray<Experience>;
  fits: Readonly<Record<string, Fit>>;
  scores: Readonly<Record<string, ScoreBreakdown>>;
  rejections: ReadonlyArray<Rejection>;
  weights: WeightProfile;
  /** "engine" or "fixtures". Shown, not hidden — a demo that quietly served
   *  fixture data while claiming to be live would be the one dishonest thing
   *  this product could do. */
  source: "engine" | "fixtures";
}

/**
 * The discovery surface: context on the left, results in the middle, map on the
 * right, and the journey below. This is the wiring TASKS.md assigns to Karan —
 * it composes the fit components and holds no opinions of its own.
 *
 * Every control writes straight into a `DiscoveryContext`. There is no shadow
 * state and no "apply" button, because the plan is supposed to update live and
 * an apply button teaches the user that it does not.
 */
export function DiscoverySurface({
  initialPlan,
  context: initialContext,
  experiences,
  fits,
  scores,
  rejections: initialRejections,
  weights,
  source,
}: DiscoverySurfaceProps) {
  const [context, setContext] = useState<DiscoveryContext>(initialContext);
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [rejections, setRejections] = useState<ReadonlyArray<Rejection>>(initialRejections);
  const [pending, setPending] = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ledgerFor, setLedgerFor] = useState<string | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [lastChange, setLastChange] = useState<ContextChange | null>(null);
  const [announcement, setAnnouncement] = useState("");

  /*
    "Ask Athiti" lives in the navigation at the top of the page, and this
    surface's chat state lives here. Rather than lift the chat state up through
    a server component, the nav dispatches one event and this listens for it.
    The alternative — threading `chatOpen` through `page.tsx` — would make a
    server component own product state, which is the wrong direction of
    dependency for no benefit.
  */
  useEffect(() => {
    const onAsk = () => setChatOpen(true);
    window.addEventListener(ASK_ATHITI_EVENT, onAsk);
    return () => window.removeEventListener(ASK_ATHITI_EVENT, onAsk);
  }, []);

  const experienceById = useMemo(() => {
    const map = new Map(experiences.map((item) => [item.id, item]));
    return map as ReadonlyMap<string, Experience> & ReadonlyMap<string, Experience>;
  }, [experiences]);

  /*
   * The card list is the plan's stops first, then the near-misses.
   *
   * The near-misses are the point: a search that returns nothing usable is the
   * most valuable dataset in the product, so the things that did not fit stay
   * on screen, de-emphasised, with the blocking reason inline.
   */
  const plannedIds = useMemo(
    () => new Set(plan.stops.map((stop) => stop.experienceId)),
    [plan.stops],
  );
  const rejectedIds = useMemo(
    () => new Set(rejections.map((rejection) => rejection.experienceId)),
    [rejections],
  );
  const rejectedById = useMemo(() => {
    const map = new Map<string, Rejection>();
    for (const rejection of rejections) {
      if (!map.has(rejection.experienceId)) map.set(rejection.experienceId, rejection);
    }
    return map;
  }, [rejections]);

  const planned = useMemo(
    () => plan.stops.map((stop) => stop.experienceId),
    [plan.stops],
  );

  const candidates = useMemo(
    () =>
      experiences
        .filter((item) => !plannedIds.has(item.id) || selectedId === item.id)
        .filter((item) => !rejectedIds.has(item.id) || item.id === selectedId),
    [experiences, plannedIds, rejectedIds, selectedId],
  );

  /** Patch the context. Every control goes through here. */
  const patchContext = useCallback((patch: Partial<DiscoveryContext>) => {
    setContext((current) => ({ ...current, ...patch }));
    // The `original` is never mutated — principle 3: the replanner diffs
    // against the first intent, not the last one.
  }, []);

  const runDiscover = useCallback(async () => {
    setPending(true);
    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(context),
      });
      if (!response.ok) return;
      const body = (await response.json()) as { plan: Plan };
      setPlan(body.plan);
      setRejections(body.plan.rejected ?? []);
      setAnnouncement(`Plan updated. ${body.plan.stops.length} stops.`);
    } finally {
      setPending(false);
    }
  }, [context]);

  const applyChange = useCallback(
    async (change: ContextChange) => {
      setPending(true);
      setLastChange(change);
      try {
        const response = await fetch("/api/discover", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ context, change }),
        });
        if (!response.ok) return;
        const body = (await response.json()) as { result: { plan: Plan; swaps: unknown[] } };
        setPlan(body.result.plan);
        setRejections(body.result.plan.rejected ?? []);
        setAnnouncement(
          `Plan changed. ${body.result.swaps.length} swap${body.result.swaps.length === 1 ? "" : "s"}.`,
        );
      } finally {
        setPending(false);
      }
    },
    [context],
  );

  const ledgerTarget = ledgerFor ? experienceById.get(ledgerFor) : null;
  const ledgerScore = ledgerFor ? (scores[ledgerFor] ?? null) : null;
  const ledgerRejection = ledgerFor ? (rejectedById.get(ledgerFor) ?? null) : null;

  return (
    <div className="min-h-dvh bg-canvas">
      {/*
        One live region for the whole surface. Plan changes and replans announce
        politely (DESIGN_SYSTEM §5) — a screen-reader user has no other way of
        knowing the itinerary just changed underneath them.
      */}
      <p aria-live="polite" role="status" className="sr-only">
        {announcement}
      </p>

      <header className="sticky top-0 z-sticky border-b border-rule bg-canvas">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-display text-ink">TravelBuddy</span>
            <span className="text-meta-sm text-ink-muted">plans that actually fit</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/*
              The stub state, stated. If the engine is not wired yet this says
              so, because a demo that looks live and is not is worse than one
              that admits it.
            */}
            <Badge tone={source === "engine" ? "fit" : "warn"}>
              {source === "engine" ? "Engine live" : "Fixtures, engine pending"}
            </Badge>
            <Button size="sm" onClick={() => setChatOpen(true)}>
              Ask in words
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[90rem] px-4 py-4">
        <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)_26rem]">
          {/* Context editor. The two big levers are time and budget. */}
          <aside aria-label="Your situation" className="min-w-0">
            <Card className="lg:sticky lg:top-20">
              <h2 className="text-caps text-ink-muted">Your situation</h2>

              <div className="mt-4 space-y-5">
                <Slider
                  label="How long have you got"
                  value={context.availableMin}
                  min={30}
                  max={720}
                  step={15}
                  format={(value) => formatMinutes(value)}
                  minLabel="30 min"
                  maxLabel="12 h"
                  onChange={(availableMin) => patchContext({ availableMin })}
                />

                <Slider
                  label="Budget for the whole plan"
                  value={context.budget ? Math.round(context.budget.minor / 100) : 5000}
                  min={0}
                  max={5000}
                  step={50}
                  format={(value) => (value >= 5000 ? "No limit" : `₹${value.toLocaleString("en-IN")}`)}
                  minLabel="₹0"
                  maxLabel="No limit"
                  onChange={(rupees) =>
                    patchContext({
                      budget:
                        rupees >= 5000 ? null : { minor: rupees * 100, currency: "INR" },
                    })
                  }
                />

                <div>
                  <span className="text-meta text-ink-muted">How many of you</span>
                  <Stepper
                    value={context.partySize}
                    onChange={(partySize) => patchContext({ partySize })}
                    label="People"
                  />
                </div>

                <div>
                  <span className="text-meta text-ink-muted">Who you are</span>
                  <div className="mt-1.5">
                    <SegmentedControl
                      label="Party type"
                      value={context.partyType}
                      onChange={(partyType) => patchContext({ partyType })}
                      options={[
                        { value: "solo", label: "Solo" },
                        { value: "couple", label: "Two" },
                        { value: "family_with_children", label: "Family" },
                        { value: "friends", label: "Friends" },
                      ]}
                    />
                  </div>
                </div>

                {context.partyType === "family_with_children" ? (
                  <div>
                    <span className="text-meta text-ink-muted">Ages</span>
                    <Stepper
                      value={context.childAges.length}
                      onChange={(count) =>
                        patchContext({
                          childAges: Array.from({ length: count }, (_, i) => context.childAges[i] ?? 5),
                        })
                      }
                      label="Children"
                    />
                  </div>
                ) : null}

                {/*
                  Needs are discrete booleans, never a score. "I need step-free"
                  has to be satisfiable exactly or not at all.
                */}
                <fieldset>
                  <legend className="text-meta text-ink-muted">Anything you need</legend>
                  <div className="mt-2 space-y-2.5">
                    <Toggle
                      label="Step-free"
                      checked={context.accessNeeds.includes("wheelchair")}
                      onChange={(on) =>
                        patchContext({
                          accessNeeds: toggleNeed(context.accessNeeds, "wheelchair", on),
                        })
                      }
                    />
                    <Toggle
                      label="Few stairs"
                      checked={context.accessNeeds.includes("lowStairs")}
                      onChange={(on) =>
                        patchContext({
                          accessNeeds: toggleNeed(context.accessNeeds, "lowStairs", on),
                        })
                      }
                    />
                    <Toggle
                      label="Restroom on site"
                      checked={context.accessNeeds.includes("restroom")}
                      onChange={(on) =>
                        patchContext({
                          accessNeeds: toggleNeed(context.accessNeeds, "restroom", on),
                        })
                      }
                    />
                    <Toggle
                      label="Stroller friendly"
                      checked={context.accessNeeds.includes("stroller")}
                      onChange={(on) =>
                        patchContext({
                          accessNeeds: toggleNeed(context.accessNeeds, "stroller", on),
                        })
                      }
                    />
                  </div>
                </fieldset>

                <div>
                  <span className="text-meta text-ink-muted">Weather</span>
                  <div className="mt-1.5">
                    <SegmentedControl
                      label="Weather"
                      value={context.weather.condition}
                      onChange={(condition) =>
                        patchContext({ weather: { ...context.weather, condition } })
                      }
                      options={[
                        { value: "clear", label: "Clear" },
                        { value: "cloudy", label: "Cloud" },
                        { value: "light_rain", label: "Light rain" },
                        { value: "heavy_rain", label: "Heavy rain" },
                      ]}
                    />
                  </div>
                </div>

                <Button variant="primary" fullWidth onClick={() => void runDiscover()} loading={pending}>
                  Find what fits
                </Button>
              </div>
            </Card>
          </aside>

          {/* Results. */}
          <section aria-label="What fits" className="min-w-0">
            {pending ? (
              <ResultListSkeleton count={3} />
            ) : candidates.length === 0 ? (
              <EmptyState
                kind="constraints"
                title="Nothing fits all your constraints"
                body="Here is what gives."
                actions={
                  <Button size="sm" onClick={() => patchContext({ availableMin: context.availableMin + 45 })}>
                    Add 45 minutes
                  </Button>
                }
                suggestions={["Step-free only", "Under an hour", "Free"]}
              />
            ) : (
              <ul className="space-y-3">
                {candidates.map((experience) => {
                  const fit = fits[experience.id];
                  if (!fit) return null;
                  const rejection = rejectedById.get(experience.id);
                  const isPlanned = plannedIds.has(experience.id);

                  return (
                    <li key={experience.id}>
                      <ResultCard
                        experience={experience}
                        fit={fit}
                        distanceMetres={undefined}
                        blockingReason={rejection?.message}
                        selected={selectedId === experience.id}
                        primaryActionLabel={isPlanned ? "In the plan" : "Add to plan"}
                        onPrimaryAction={
                          isPlanned
                            ? undefined
                            : () => {
                                setRevealedId(experience.id);
                                setSelectedId(experience.id);
                                setAnnouncement(`${experience.name} revealed on the map.`);
                              }
                        }
                        onSelect={(item) => {
                          setLedgerFor(item.id);
                          setLedgerOpen(true);
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            {/* The journey. Vertical, with a connector between every pair. */}
            <Card className="mt-4">
              <h2 className="text-caps text-ink-muted">Your plan</h2>
              <div className="mt-3">
                <PlanTimeline
                  plan={plan}
                  experiences={experienceById}
                  onOpenLedger={(id) => {
                    setLedgerFor(id);
                    setLedgerOpen(true);
                  }}
                />
              </div>
            </Card>
          </section>

          {/* Map and the reality panel. */}
          <aside aria-label="Map and changes" className="min-w-0 space-y-4">
            <MapPanel
              experiences={experiences}
              plan={plan}
              experienceById={experienceById}
              revealedId={revealedId}
              selectedIds={planned}
              onSelect={(id) => setSelectedId(id)}
              className="h-[24rem] lg:h-[32rem]"
            />

            <Card>
              <RealityPanel
                triggers={CONTEXT_TRIGGERS}
                onApply={applyChange}
                pending={pending}
                lastChange={lastChange}
              />
            </Card>

            <Card>
              <LearnedWeights
                weights={weights.weights}
                source={weights.source}
                observations={weights.observations}
                version={weights.version}
              />
            </Card>

            <Card>
              <AccessibilityControls />
            </Card>
          </aside>
        </div>
      </main>

      {/* The why-not-that ledger, at most two taps from anywhere. */}
      <Sheet
        open={ledgerOpen}
        onOpenChange={setLedgerOpen}
        side="right"
        title={ledgerTarget?.name ?? "Why"}
        label="Why this, and why not the others"
      >
        {ledgerTarget && ledgerScore ? (
          <WhyLedger
            score={ledgerScore}
            rejections={ledgerRejection ? [ledgerRejection] : []}
            rejectionNames={ledgerRejection ? { [ledgerRejection.experienceId]: ledgerTarget.name } : undefined}
          />
        ) : null}
      </Sheet>

      <ChatSidecar
        open={chatOpen}
        onOpenChange={setChatOpen}
        context={context}
        onDecision={(decision) => {
          /*
            The only thing chat is allowed to touch. `DialogueDecision` is
            `.strict()` in the contract, so there is no field here that could
            carry a recommendation or reorder a plan — the narrowness is
            enforced by the schema, not by this handler being careful.
          */
          setContext((current) => ({ ...current, ...mapPatchToContext(decision.contextPatch, current) }));
          setAnnouncement(decision.reply);
        }}
      />
    </div>
  );
}

/* ========================================================================== */

function Stepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label={`One fewer ${label.toLowerCase()}`}
      >
        −
      </Button>
      <output
        aria-live="polite"
        className="min-w-8 text-center text-num text-ink"
      >
        {value}
      </output>
      <Button
        size="sm"
        onClick={() => onChange(value + 1)}
        disabled={value >= 12}
        aria-label={`One more ${label.toLowerCase()}`}
      >
        +
      </Button>
    </div>
  );
}

function toggleNeed<T extends string>(current: ReadonlyArray<T>, need: T, on: boolean): T[] {
  return on ? [...new Set([...current, need])] : current.filter((item) => item !== need);
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  return mins === 0 ? `${hours} h` : `${hours} h ${String(mins).padStart(2, "0")} m`;
}

/**
 * Translate the contract's flat `DialogueDecision.contextPatch` onto the nested
 * `DiscoveryContext`.
 *
 * This is a RENAME, not a merge: the patch is deliberately tiny and flat so the
 * model's blast radius is obvious, while the context is nested because the
 * engine needs it that way. Anything the patch can express, this maps; anything
 * it cannot is dropped rather than guessed at.
 */
function mapPatchToContext(
  patch: Record<string, unknown>,
  current: DiscoveryContext,
): Partial<DiscoveryContext> {
  const out: Partial<DiscoveryContext> = {};

  if (typeof patch.availableMin === "number") out.availableMin = patch.availableMin;
  if (typeof patch.budgetMinor === "number") {
    out.budget = { minor: patch.budgetMinor, currency: "INR" };
  }
  if (Array.isArray(patch.accessNeeds)) {
    out.accessNeeds = patch.accessNeeds as DiscoveryContext["accessNeeds"];
  }
  if (Array.isArray(patch.interests)) {
    out.interests = [...new Set([...current.interests, ...(patch.interests as string[])])];
  }
  if (Array.isArray(patch.avoid)) {
    out.avoid = [...new Set([...current.avoid, ...(patch.avoid as string[])])];
  }
  if (typeof patch.mood === "string") {
    // Mood is not a context field, so it lands on `avoid`/`interests` the only
    // honest way: an explicit low-energy note the engine can read later.
    if (patch.mood === "low_energy") {
      out.avoid = [...new Set([...current.avoid, "crowded", "transfers"])];
    }
  }
  return out;
}
