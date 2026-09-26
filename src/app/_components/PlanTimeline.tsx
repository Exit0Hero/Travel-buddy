"use client";

import { Pin, Sparkles } from "lucide-react";

import type { Experience, Plan } from "@/contracts";

import { cn } from "@/components/cn";
import { Badge } from "@/components/ui/Badge";
import {
  minorToRupeesExact,
  minutesToClock,
  ratingToDisplay,
  TravelConnector,
} from "@/components/fit";
import { PlanStressRadar, TimeBudgetBar } from "@/components/fit";

export interface PlanTimelineProps {
  plan: Plan;
  /** Joins a stop's `experienceId` back to its row. The contract's PlanStop
   *  carries no location or name, so the timeline cannot render without this. */
  experiences: ReadonlyMap<string, Experience>;
  onChangeLegMode?: (legIndex: number) => void;
  onOpenLedger?: (experienceId: string) => void;
  className?: string;
}

/**
 * PlanTimeline — vertical, with a travel connector between every pair of stops.
 *
 * The connector is a SIBLING of the stop list, not a child of a stop. That is
 * the whole reason this component exists as its own file rather than a
 * `children` prop on a stop card: the leg is a real edge between two nodes, so
 * in the DOM it sits between them, and a screen reader announces "walk 12
 * minutes" between the two places rather than as a property of the second one.
 *
 * Every leg is rendered. The contract's DoD says a connector between EVERY pair
 * of stops, and skipping one because it is short would leave the user unable to
 * account for the gap in their day.
 */
export function PlanTimeline({
  plan,
  experiences,
  onChangeLegMode,
  onOpenLedger,
  className,
}: PlanTimelineProps) {
  // Legs are matched to gaps by destination, because that is what they connect.
  // A leg from the origin to the first stop has no gap above it and is rendered
  // as the "getting there" line instead, or it would be lost.
  const legBefore = (stopIndex: number) =>
    plan.legs.find((leg) => leg.toId === plan.stops[stopIndex]?.experienceId) ?? null;
  const originLeg = plan.legs.find(
    (leg) => leg.toId === plan.stops[0]?.experienceId && !plan.stops.some((stop) => stop.experienceId === leg.fromId),
  );

  return (
    <div className={cn("min-w-0", className)}>
      <TimeBudgetBar
        availableMin={Math.max(plan.totalMin, deriveAvailable(plan))}
        plannedMin={plan.totalMin}
        stopBoundariesMin={plan.stops.map((stop) => stop.arriveMin)}
        label="Your window"
      />

      <ol className="mt-4">
        {originLeg ? (
          <li>
            <TravelConnector
              leg={originLeg}
              arriveAtMin={plan.stops[0]?.arriveMin}
              onChangeMode={onChangeLegMode ? () => onChangeLegMode(plan.legs.indexOf(originLeg)) : undefined}
            />
          </li>
        ) : null}

        {plan.stops.map((stop, index) => {
          const experience = experiences.get(stop.experienceId);
          const nextStop = plan.stops[index + 1];
          // The connector AFTER this stop is the leg whose destination is the
          // following stop, which is the same lookup `legBefore` does at the
          // next index.
          const nextLeg = nextStop ? legBefore(index + 1) : null;
          const isLast = index === plan.stops.length - 1;

          return (
            <li key={`${stop.experienceId}-${stop.order}`} className="min-w-0">
              <article
                className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 py-3"
                aria-label={experience?.name ?? stop.experienceId}
              >
                {/*
                  The timeline spine. `role="presentation"` because the ordered
                  list already conveys sequence to a screen reader; a second
                  numbered column would just be read twice.
                */}
                <div aria-hidden className="flex flex-col items-center">
                  <span className="mt-1.5 grid size-5 shrink-0 place-items-center rounded-full border border-accent bg-surface text-num-sm text-accent">
                    {stop.order + 1}
                  </span>
                  {!isLast ? <span className="mt-1 w-px flex-1 bg-rule" /> : null}
                </div>

                <div className="min-w-0">
                  <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <h3 className="text-title text-ink">
                        {experience?.name ?? stop.experienceId}
                      </h3>
                      {experience?.neighbourhood ? (
                        <span className="inline-flex items-center gap-1 text-meta-sm text-ink-muted">
                          <Pin aria-hidden className="size-3" strokeWidth={2} />
                          {experience.neighbourhood}
                        </span>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-num-sm text-ink-muted">
                      {minutesToClock(stop.arriveMin)} – {minutesToClock(stop.departMin)}
                    </span>
                  </header>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-num-sm text-ink-muted">
                    <span>{stop.fit.activityMin} min on site</span>
                    {/*
                      `Fit.cost` is the engine's own whole-party figure for this
                      stop, so it is authoritative. The per-person price on the
                      experience is only a fallback for a stop whose fit was not
                      carried — the timeline has no party size, so multiplying
                      here would be a guess dressed as arithmetic.
                    */}
                    {stop.fit.cost.minor > 0 ? (
                      <span>{minorToRupeesExact(stop.fit.cost.minor)}</span>
                    ) : experience?.pricePerPerson ? (
                      <span>
                        {minorToRupeesExact(experience.pricePerPerson.minor)}
                        <span className="text-ink-muted">/person</span>
                      </span>
                    ) : (
                      <span>Free</span>
                    )}
                    {experience ? (
                      <span className="text-ink-muted">
                        {ratingToDisplay(experience.rating.value, experience.rating.count)}
                      </span>
                    ) : null}
                  </div>

                  {/*
                    `inferred` is labelled here too, not only on the card. The
                    itinerary is what a traveller screenshots and sends to
                    someone else, so a fact they cannot trust has to be marked
                    where it leaves the app too.
                  */}
                  {experience &&
                  Object.values(experience.provenance).some((p) => p === "inferred") ? (
                    <div className="mt-1.5">
                      <Badge tone="warn" icon={<Sparkles aria-hidden className="size-3" strokeWidth={2} />}>
                        Some details AI-inferred
                      </Badge>
                    </div>
                  ) : null}

                  {stop.why.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {stop.why.map((reason, reasonIndex) => (
                        <li key={reasonIndex} className="flex items-start gap-1.5">
                          <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                          <span className="text-body text-ink-muted">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {onOpenLedger ? (
                    <button
                      type="button"
                      onClick={() => onOpenLedger(stop.experienceId)}
                      className="mt-2 inline-flex min-h-9 items-center rounded-md px-2 text-meta text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-accent-soft hover:text-ink"
                    >
                      Why this, and why not the others
                    </button>
                  ) : null}

                  {stop.fit.verdict !== "fits" ? (
                    <p
                      className={cn(
                        "mt-2 rounded-sm px-2 py-1 text-meta",
                        stop.fit.verdict === "tight" ? "bg-warn-soft text-warn" : "bg-alarm-soft text-alarm",
                      )}
                    >
                      {stop.fit.verdict === "tight"
                        ? `Tight — ${stop.fit.totalMin} min against ${stop.fit.availableMin} available.`
                        : "Does not fit your window. Kept here because the near-miss is worth seeing."}
                    </p>
                  ) : null}
                </div>
              </article>

              {/*
                The connector to the NEXT stop, as a sibling of both. If the
                engine emitted no leg for this pair, say so rather than
                inventing one: a silent gap in a journey reads as "they are
                next door", which is exactly the assumption the travel time
                exists to prevent.
              */}
              {!isLast && nextLeg ? (
                <TravelConnector
                  leg={nextLeg}
                  arriveAtMin={plan.stops[index + 1]?.arriveMin}
                  onChangeMode={
                    onChangeLegMode ? () => onChangeLegMode(plan.legs.indexOf(nextLeg)) : undefined
                  }
                />
              ) : !isLast ? (
                <p className="py-1.5 pl-6 text-meta-sm text-warn">
                  No travel time between these two. Ask for a route to check it.
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      {plan.stressFactors.length > 0 ? (
        <div className="mt-6 rounded-md border border-rule bg-surface p-4">
          <PlanStressRadar plan={plan} />
        </div>
      ) : null}

      {plan.relaxations.length > 0 ? (
        <section className="mt-4 rounded-md border border-warn bg-warn-soft p-3">
          <h3 className="text-caps text-warn">What we gave up to make this fit</h3>
          <ul className="mt-1.5 space-y-1">
            {plan.relaxations.map((relaxation) => (
              <li key={relaxation.rung} className="text-body text-ink">
                <span className="font-medium">{relaxation.label}.</span> {relaxation.gaveUp}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/**
 * `availableMin` is not on `Plan` — it lives on the context. The contract
 * defines `utilisation` as plannedMin / availableMin, so this is a division
 * rather than a second opinion about the window.
 */
function deriveAvailable(plan: Plan): number {
  if (!Number.isFinite(plan.utilisation) || plan.utilisation <= 0) return plan.totalMin;
  return Math.round(plan.totalMin / plan.utilisation);
}
