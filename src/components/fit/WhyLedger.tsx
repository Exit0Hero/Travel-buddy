"use client";

import { useId, useState } from "react";
import { Scale, Ban } from "lucide-react";

import type { PlanStop, Rejection, ScoreBreakdown } from "@/contracts";

import { cn } from "../cn";
import { Badge } from "../ui/Badge";
import { ScoreBreakdownList, WhyRejected } from "./ScoreBreakdownList";

/**
 * WhyLedger — DUAL, because the thesis is transparency.
 *
 *   why this      ScoreComponent[] as ranked sentences, learned ones marked
 *   why not that  the Rejection for a specific thing
 *
 * The second half is the feature nobody else has, and the one the demo turns on
 * (docs/DEMO_SCRIPT step 3). docs/FEATURES.md §2 calls it "your highest-value
 * feature" and TASKS.md's definition of done requires both halves within two
 * taps — so both are open by default here rather than behind a second click.
 * One tap to reach, which is inside the budget.
 *
 * Neither half is computed. `ScoreBreakdown.components` and `Rejection.message`
 * arrive finished from the engine.
 */
export interface WhyLedgerProps {
  /** The scored stop. Omit to render only the "why not that" half. */
  score?: ScoreBreakdown;
  /** The ranked sentences the engine already wrote. */
  why?: PlanStop["why"];
  /** One or more rejections for experiences that did not make it. */
  rejections?: ReadonlyArray<Rejection>;
  /** Names, so a rejection reads as a sentence about a place. */
  rejectionNames?: Readonly<Record<string, string>>;
  /** Recovery actions, keyed by experience id. */
  rejectionActions?: Readonly<
    Record<string, ReadonlyArray<{ label: string; onSelect: () => void }>>
  >;
  className?: string;
}

export function WhyLedger({
  score,
  why,
  rejections,
  rejectionNames,
  rejectionActions,
  className,
}: WhyLedgerProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  // Generated per instance. A hardcoded id here means two ledgers on one page
  // emit duplicate DOM ids, and `aria-controls` then points at the first
  // match — so the second ledger's toggle would announce and control the
  // first one's panel.
  const breakdownId = useId();
  // Section heading ids back `aria-labelledby`. Also per instance: two ledgers
  // on one page would otherwise duplicate these ids and both sections would be
  // labelled by the first heading found.
  const whyThisHeadingId = useId();
  const whyNotHeadingId = useId();
  const hasWhyThis = Boolean(score) || (why && why.length > 0);
  const hasWhyNot = Boolean(rejections && rejections.length > 0);

  if (!hasWhyThis && !hasWhyNot) return null;

  return (
    <div className={cn("min-w-0", className)}>
      {hasWhyThis ? (
        <section aria-labelledby={whyThisHeadingId} className="min-w-0">
          <h3
            id={whyThisHeadingId}
            className="flex items-center gap-1.5 text-caps text-ink-muted"
          >
            <Scale aria-hidden className="size-3.5" strokeWidth={2} />
            Why this
          </h3>

          {/*
            The engine's own sentences, verbatim and in order. `why` is already
            ordered by contribution, so re-sorting here would discard a ranking
            decision that belongs to the engine.
          */}
          {why && why.length > 0 ? (
            <ol className="mt-2 space-y-1.5">
              {why.map((reason, index) => (
                <li key={`${index}-${reason}`} className="flex items-start gap-2">
                  <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                  <span className="min-w-0 text-body text-ink">{reason}</span>
                </li>
              ))}
            </ol>
          ) : null}

          {score ? (
            <>
              <button
                type="button"
                onClick={() => setShowBreakdown((open) => !open)}
                aria-expanded={showBreakdown}
                aria-controls={breakdownId}
                className={cn(
                  "mt-2 inline-flex min-h-9 items-center rounded-md px-2 text-meta",
                  "text-ink-muted transition-colors duration-[var(--dur-fast)]",
                  "hover:bg-accent-soft hover:text-ink",
                )}
              >
                {showBreakdown ? "Hide the arithmetic" : "Show the arithmetic"}
              </button>

              {/*
                Same `inert` + grid-rows collapse as the Disclosure primitive,
                inlined because this panel's open state also has to announce
                itself — the arithmetic appearing changes what the row means.
              */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-[var(--dur-base)]",
                  "ease-[var(--ease-in-out)]",
                  showBreakdown ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden" inert={!showBreakdown}>
                  <div id={breakdownId} className="pt-1">
                    <ScoreBreakdownList score={score} />
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {hasWhyThis && hasWhyNot ? <hr className="my-3 border-0 border-t border-rule" /> : null}

      {hasWhyNot ? (
        <section aria-labelledby={whyNotHeadingId} className="min-w-0">
          <h3 id={whyNotHeadingId} className="flex items-center gap-1.5 text-caps text-ink-muted">
            <Ban aria-hidden className="size-3.5" strokeWidth={2} />
            Why not that
          </h3>

          <ul className="mt-2 space-y-2">
            {(rejections ?? []).map((rejection) => (
              <li key={`${rejection.experienceId}-${rejection.code}`}>
                <WhyRejected
                  rejection={rejection}
                  name={rejectionNames?.[rejection.experienceId]}
                  actions={rejectionActions?.[rejection.experienceId]}
                />
              </li>
            ))}
          </ul>

          {rejections && rejections.length > 3 ? (
            <p className="mt-2 text-meta-sm text-ink-muted">
              {rejections.length} did not fit. The rest are in the full ledger.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

/* ========================================================================== */

/**
 * The "what I learned about you" panel.
 *
 * A recommendation you cannot interrogate is just a vibe, and nothing is
 * learned about a traveller without being shown to them (contracts, on
 * WeightProfile). So this shows the weights, marks which are learned rather
 * than stated, shows how many observations the learned part rests on, and
 * makes each one editable.
 *
 * The observation count is the honest part. "Learned from 4 interactions" and
 * "learned from 400" are very different claims and the panel must not imply
 * the second when it has the first.
 */
export interface LearnedWeightsProps {
  weights: Readonly<Record<string, number>>;
  source: "prior" | "learned" | "user_edited";
  observations: number;
  version: string;
  /** Persists an edit. Omit to render read-only. */
  onEdit?: (key: string, value: number) => void;
  className?: string;
}

const WEIGHT_LABELS: Record<string, string> = {
  activity: "Activity quality",
  travel: "Travel time",
  price: "Price",
  rating: "Rating",
  proximity: "Proximity",
  accessibility: "Accessibility match",
  kidFriendly: "Kid-friendly",
  localAuthenticity: "Local character",
  indoorComfort: "Indoor comfort",
  novelty: "Novelty",
  categoryFit: "Category match",
  hours: "Opening hours",
  crowd: "Crowd level",
  weatherFit: "Weather fit",
};

export function LearnedWeights({
  weights,
  source,
  observations,
  version,
  onEdit,
  className,
}: LearnedWeightsProps) {
  const entries = Object.entries(weights).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  // Per instance, so two panels showing the same weight key do not share a
  // label's `for` target and silently cross-wire their sliders.
  const idPrefix = useId();

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-caps text-ink-muted">What I learned about you</h3>
        {source === "learned" ? (
          <Badge tone="info">
            {observations} observation{observations === 1 ? "" : "s"}
          </Badge>
        ) : source === "user_edited" ? (
          <Badge tone="accent">Edited by you</Badge>
        ) : (
          <Badge tone="outline">Starting point</Badge>
        )}
      </div>

      {/*
        Stated and learned are never mixed silently, which is why the badge
        above is not optional. A learned weight presented as a preference is a
        claim the traveller never made.
      */}
      {source === "learned" && observations < 10 ? (
        <p className="mt-1.5 text-meta-sm text-warn">
          Early signal, from {observations} interaction{observations === 1 ? "" : "s"}. Change
          anything below and it becomes your setting rather than our guess.
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {entries.map(([key, value]) => {
          const label = WEIGHT_LABELS[key] ?? key;
          return (
            <li key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <label htmlFor={`${idPrefix}-weight-${key}`} className="min-w-0">
                <span className="block truncate text-body text-ink">{label}</span>
                <span className="text-meta-sm text-ink-muted">{key}</span>
              </label>
              {onEdit ? (
                <input
                  id={`${idPrefix}-weight-${key}`}
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={value}
                  onChange={(event) => onEdit(key, Number(event.target.value))}
                  className="w-32 accent-[var(--accent)]"
                />
              ) : (
                <span className="text-num text-ink-muted">{value.toFixed(2)}</span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-meta-sm text-ink-muted">Weight profile {version}</p>
    </div>
  );
}
