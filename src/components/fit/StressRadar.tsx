import type { Plan } from "@/contracts";

import { cn } from "../cn";

/**
 * StressRadar — 7 dimensions, 0..100, with ONE rescue move.
 *
 * Weights are fixed by DESIGN_SYSTEM §3 and must not be re-derived here; they
 * are the model's, not the presentation's. Borrowed from
 * nomadnote/components/TripStressRadar.tsx:120-246.
 *
 * Three rules the spec pins down, all of which are easy to get wrong:
 *
 * 1. Labels break at 68 → "High friction" and 38 → "Trip feels sane". A
 *    continuous gradient of adjectives ("manageable", "tense", "exhausting")
 *    is worse than useless — it invents a scale the numbers do not support.
 *
 * 2. Exactly ONE rescue sentence, for the worst factor only. Three rescue
 *    moves is a list of suggestions, and a list is not a decision. The user
 *    asked whether the day works; the answer is one thing to change.
 *
 * 3. Per-factor bar colour INVERTS for positive dimensions. `overload` and
 *    `pinDebt` are bad when HIGH; `spreadRisk` is also bad when high, but a
 *    dimension like "walkability" or "slack" is bad when LOW. Getting this
 *    backwards paints a green bar next to a red number.
 */
export interface StressDimension {
  dimension: string;
  weight: number;
  value: number;
  rescue?: string | null;
}

/** The label breaks. Both are spec, not taste. */
const HIGH_LABEL = "High friction";
const SANE_LABEL = "Trip feels sane";
const HIGH_THRESHOLD = 68;
const SANE_THRESHOLD = 38;

/**
 * Which way each dimension reads. Absent from this map, a dimension is treated
 * as "high is bad", which is the majority case.
 *
 * The plan's own `stressFactors` do not carry a polarity, so this is the one
 * place the sign lives. It is a presentation concern and belongs to Karan.
 */
const POSITIVE_WHEN_LOW = new Set<string>([
  "slack",
  "buffer",
  "flexibility",
  "walkability",
  "indoorRatio",
  "headroom",
]);

const DIMENSION_LABELS: Record<string, string> = {
  overload: "Planned minutes",
  pinDebt: "Fixed-time anchors",
  weatherRisk: "Weather exposure",
  fomoRisk: "Left on the table",
  spreadRisk: "Geographic spread",
  transitComplexity: "Transfers",
  reservationRisk: "Bookings that could fail",
};

/** The canonical weights, for the fallback bar when a plan omits them. */
const CANONICAL_WEIGHTS: ReadonlyArray<{ dimension: string; weight: number }> = [
  { dimension: "overload", weight: 0.25 },
  { dimension: "pinDebt", weight: 0.18 },
  { dimension: "weatherRisk", weight: 0.14 },
  { dimension: "fomoRisk", weight: 0.13 },
  { dimension: "spreadRisk", weight: 0.12 },
  { dimension: "transitComplexity", weight: 0.1 },
  { dimension: "reservationRisk", weight: 0.08 },
];

export interface StressRadarProps {
  score: number;
  factors: ReadonlyArray<StressDimension>;
  className?: string;
}

/** Convenience wrapper reading the two Plan fields. */
export function PlanStressRadar({ plan, className }: { plan: Plan; className?: string }) {
  return (
    <StressRadar
      score={plan.stressScore}
      factors={plan.stressFactors.map((factor) => ({
        dimension: factor.dimension,
        weight: factor.weight,
        value: factor.value,
        rescue: factor.rescue,
      }))}
      className={className}
    />
  );
}

export function StressRadar({ score, factors, className }: StressRadarProps) {
  const resolved = resolveFactors(factors);
  const verdict = score >= HIGH_THRESHOLD ? HIGH_LABEL : score <= SANE_THRESHOLD ? SANE_LABEL : null;

  // Rule 2: the worst factor only, and only if it offers a rescue.
  const rescue = pickRescue(resolved);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-caps text-ink-muted">Plan stress</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-num text-ink">{Math.round(score)}</span>
          {verdict ? (
            <span
              className={cn(
                "text-meta-sm font-medium",
                score >= HIGH_THRESHOLD ? "text-alarm" : "text-fit",
              )}
            >
              {verdict}
            </span>
          ) : (
            <span className="text-meta-sm text-ink-muted">Workable</span>
          )}
        </div>
      </div>

      {/*
        The meter for the headline number. `aria-hidden` because the score and
        verdict are both real text immediately above — a second announcement of
        the same fact is noise.
      */}
      <div
        aria-hidden
        className="mt-2 h-1.5 w-full overflow-hidden rounded-pill bg-accent-soft"
      >
        <div
          className={cn(
            "h-full rounded-pill",
            score >= HIGH_THRESHOLD ? "bg-alarm" : score <= SANE_THRESHOLD ? "bg-fit" : "bg-warn",
          )}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>

      <ul className="mt-3 space-y-1.5">
        {resolved.map((factor) => {
          const positive = POSITIVE_WHEN_LOW.has(factor.dimension);
          const value = Math.min(100, Math.max(0, factor.value));
          // Rule 3: positive dimensions paint the OTHER end of the scale.
          const severity = positive ? 100 - value : value;
          const label = DIMENSION_LABELS[factor.dimension] ?? titleCase(factor.dimension);

          return (
            <li key={factor.dimension} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2">
              <span className="truncate text-meta-sm text-ink-muted" title={label}>
                {label}
              </span>
              <span
                aria-hidden
                className="h-1.5 w-full overflow-hidden rounded-pill bg-accent-soft"
              >
                <span
                  className={cn(
                    "block h-full rounded-pill",
                    severity >= 60 ? "bg-alarm" : severity >= 35 ? "bg-warn" : "bg-fit",
                  )}
                  style={{ width: `${value}%` }}
                />
              </span>
              <span className="text-num-sm text-ink-muted">
                {Math.round(value)}
                <span className="text-ink-muted"> · {Math.round(factor.weight * 100)}%</span>
              </span>
            </li>
          );
        })}
      </ul>

      {/*
        Rule 2 again, and it is a hard constraint: exactly one sentence, for the
        worst factor. If there is genuinely nothing to suggest, this renders
        nothing rather than falling back to a generic tip.
      */}
      {rescue ? (
        <div className="mt-3 rounded-md border border-rule bg-canvas p-3">
          <span className="text-caps text-ink-muted">Rescue move</span>
          <p className="mt-1 text-body text-ink">{rescue.text}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Ensure all seven dimensions are present even when the engine sends fewer,
 * so the radar never reflows between plans. A missing dimension is a layout
 * shift at exactly the moment the user is comparing two plans.
 */
function resolveFactors(factors: ReadonlyArray<StressDimension>): StressDimension[] {
  const byDimension = new Map(factors.map((factor) => [factor.dimension, factor]));
  return CANONICAL_WEIGHTS.map((canonical) => {
    const found = byDimension.get(canonical.dimension);
    if (found) return { ...found, weight: found.weight || canonical.weight };
    // Absent means the engine did not flag it, which is a zero, not a hole.
    return { dimension: canonical.dimension, weight: canonical.weight, value: 0, rescue: null };
  });
}

/** The highest-weight factor that offers a rescue wins. Weight, not value:
 *  a severe low-weight factor is less worth the user's attention. */
function pickRescue(factors: ReadonlyArray<StressDimension>): { text: string; dimension: string } | null {
  let best: StressDimension | null = null;
  for (const factor of factors) {
    const rescue = factor.rescue;
    if (typeof rescue !== "string" || rescue.trim().length === 0) continue;
    if (!best || factor.weight > best.weight) best = { ...factor, rescue };
  }
  if (!best || typeof best.rescue !== "string") return null;
  return { text: best.rescue, dimension: best.dimension };
}

function titleCase(value: string): string {
  const spaced = value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
