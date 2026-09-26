import type { Rejection, ScoreBreakdown } from "@/contracts";

import { cn } from "../cn";
import { Badge } from "../ui/Badge";
import { minutesToDuration, rejectionLabel, shortfallToPhrase } from "./format";

/**
 * ScoreBreakdownList — the components as a bar chart with the weight visible.
 *
 * The point is to prove the ranking is ARITHMETIC, not a hunch. So every row
 * shows three things: the signed contribution, the weight that produced it, and
 * the total adds up. If a contribution can be negative and still be shown, the
 * user can check the arithmetic themselves — that is the entire feature, and
 * hiding the negatives would defeat it.
 */
export interface ScoreBreakdownListProps {
  score: ScoreBreakdown;
  /** Hide rows whose contribution is negligible. Off by default: an audit you
   *  can trim is not an audit. */
  compact?: boolean;
  className?: string;
}

export function ScoreBreakdownList({ score, compact = false, className }: ScoreBreakdownListProps) {
  const components = compact
    ? score.components.filter((component) => Math.abs(component.value) > 0.01)
    : score.components;

  // Largest magnitude first, so the biggest lever is at the top regardless of
  // declaration order.
  const ordered = [...components].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const maxMagnitude = Math.max(0.01, ...ordered.map((component) => Math.abs(component.value)));

  return (
    <div className={cn("min-w-0", className)}>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Score components for this recommendation, totalling {score.total.toFixed(2)}.
          Weight profile {score.profileVersion}.
        </caption>
        <thead>
          <tr className="text-caps text-ink-muted">
            <th scope="col" className="pb-1 font-semibold">
              Factor
            </th>
            <th scope="col" className="pb-1 text-right font-semibold">
              Weight
            </th>
            <th scope="col" className="pb-1 text-right font-semibold">
              Effect
            </th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((component) => {
            const isLearned = score.learnedComponents.includes(component.key);
            const magnitude = Math.abs(component.value);
            const share = (magnitude / maxMagnitude) * 100;
            const isPenalty = component.value < 0;

            return (
              <tr key={component.key} className="border-t border-rule align-top">
                <th scope="row" className="py-1.5 pr-2 font-normal">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-body text-ink">{component.label}</span>
                    {/*
                      A learned weight is a claim about the person, so it is
                      marked. Hidden learned weights are how a recommendation
                      becomes unexplainable while still looking personalised.
                    */}
                    {isLearned ? (
                      <Badge tone="info" className="shrink-0">
                        Learned
                      </Badge>
                    ) : null}
                  </span>
                  {/*
                    The bar is aria-hidden: the Effect column already carries
                    the number, and a bar that duplicates it just makes the
                    table read twice.
                  */}
                  <span aria-hidden className="mt-1 block h-1 w-full overflow-hidden rounded-pill bg-accent-soft">
                    <span
                      className={cn(
                        "block h-full rounded-pill",
                        isPenalty ? "bg-alarm" : "bg-accent",
                      )}
                      style={{ width: `${share}%` }}
                    />
                  </span>
                  {component.reason ? (
                    <span className="mt-0.5 block text-meta-sm text-ink-muted">
                      {component.reason}
                    </span>
                  ) : null}
                </th>
                <td className="py-1.5 text-right text-num-sm text-ink-muted">
                  {component.weight.toFixed(2)}
                </td>
                <td
                  className={cn(
                    "py-1.5 text-right text-num-sm font-medium",
                    isPenalty ? "text-alarm" : "text-fit",
                  )}
                >
                  {isPenalty ? "−" : "+"}
                  {magnitude.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-rule">
            <th scope="row" className="py-1.5 pr-2 text-left font-medium text-ink">
              Total
            </th>
            <td className="text-num-sm text-ink-muted">
              {score.profileVersion}
            </td>
            <td className="py-1.5 text-right text-num-sm font-medium text-ink">
              {score.total.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ========================================================================== */

/**
 * WhyRejected — the "why not that" answer for ONE experience.
 *
 * This is the feature the product thesis rests on, and the one a judge will
 * remember. The contract makes it possible: `Rejection.message` is required to
 * be a finished sentence with the real numbers already in it, never
 * "constraint violated". So this component's job is narrow and important —
 * do not paraphrase it, do not summarise it, show it verbatim and put the
 * shortfall next to it in mono.
 *
 * `relaxable` drives whether a recovery action is offered at all. Offering
 * "add 40 minutes" for a rejection that no amount of time would fix is how a
 * helpful panel becomes a nuisance.
 */
export interface WhyRejectedProps {
  rejection: Rejection;
  /** The name of the rejected experience, so the answer stands alone. */
  name?: string;
  /** Distance from the traveller, for the header line. */
  distanceLabel?: string;
  /** One real mutation of the context each. Three is the design target. */
  actions?: ReadonlyArray<{ label: string; onSelect: () => void }>;
  className?: string;
}

export function WhyRejected({
  rejection,
  name,
  distanceLabel,
  actions,
  className,
}: WhyRejectedProps) {
  const shortfall = shortfallToPhrase(rejection.shortfall, rejection.unit);

  return (
    <div className={cn("rounded-md border border-rule bg-canvas p-3", className)}>
      {name ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <span className="text-body font-medium text-ink">{name}</span>
          {distanceLabel ? (
            <span className="text-num-sm text-ink-muted">{distanceLabel}</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 flex items-start gap-1.5">
        <span aria-hidden className="mt-0.5 font-data text-meta-sm leading-none text-alarm">
          ✗
        </span>
        <div className="min-w-0">
          {/*
            Verbatim. The engine wrote a finished sentence with real numbers in
            it; rewriting it here would be the one thing this component must
            never do.
          */}
          <p className="text-body text-alarm">{rejection.message}</p>
          {shortfall ? (
            <p className="mt-0.5 text-num-sm text-ink-muted">
              {rejection.code === "over_budget" ? shortfall : shortfall}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral">{rejectionLabel(rejection.code)}</Badge>
        {rejection.relaxable ? (
          <Badge tone="warn">Fixable by changing something</Badge>
        ) : null}
      </div>

      {/*
        Three responses, each a real mutation. DESIGN_SYSTEM §3 and
        docs/FEATURES.md §2 both specify three, and the third — see what to cut
        — is the good one.
      */}
      {actions && actions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onSelect}
              className={cn(
                "inline-flex min-h-9 items-center rounded-md border border-rule bg-surface",
                "px-3 text-meta text-ink",
                "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]",
                "hover:border-accent hover:bg-accent-soft",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Exported so the ledger can show a duration beside a minutes shortfall. */
export { minutesToDuration };
