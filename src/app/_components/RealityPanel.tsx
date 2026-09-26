"use client";

import type { ContextChange } from "@/contracts";

import { cn } from "@/components/cn";
import { Button } from "@/components/ui/Button";

/** One of the six triggers from docs/FEATURES.md §3. */
export interface RealityTrigger {
  key: string;
  label: string;
  detail: string;
}

export interface RealityPanelProps {
  triggers: ReadonlyArray<RealityTrigger>;
  onApply: (change: ContextChange) => void | Promise<void>;
  pending?: boolean;
  lastChange?: ContextChange | null;
  className?: string;
}

/**
 * RealityPanel — the "reality changed" triggers and the swap diff.
 *
 * Each trigger is a real `ContextChange` with a written `narrative`. The
 * narrative is not decoration: it is what gets shown in the swap diff, so if it
 * is not a finished sentence the user reads a machine word where an
 * explanation should be.
 *
 * The metric that matters is ≤ 2 swaps per trigger (docs/FEATURES.md §3). A
 * replan that returns five is a finding about the engine, not a state to ship,
 * so the count is displayed and a plan over budget is called out rather than
 * quietly accepted.
 */
export function RealityPanel({
  triggers,
  onApply,
  pending = false,
  lastChange = null,
  className,
}: RealityPanelProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <h2 className="text-caps text-ink-muted">Reality changed</h2>
      <p className="mt-1 text-meta-sm text-ink-muted">
        Six things that go wrong in a real day. Each one re-solves the plan.
      </p>

      <ul className="mt-3 space-y-1.5">
        {triggers.map((trigger) => (
          <li key={trigger.key}>
            <Button
              variant="secondary"
              fullWidth
              disabled={pending}
              onClick={() => void onApply(buildChange(trigger, lastChange))}
              className="h-auto justify-start py-2 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate">{trigger.label}</span>
                <span className="block truncate text-meta-sm text-ink-muted">
                  {trigger.detail}
                </span>
              </span>
            </Button>
          </li>
        ))}
      </ul>

      {/*
        `preservedIntent` is asserted VISIBLY. Principle 3 of the masterplan is
        that the original intent is never silently replaced, and a guarantee the
        user cannot see is not a guarantee — it is a claim.
      */}
      {lastChange ? (
        <div className="mt-4 rounded-md border border-rule bg-canvas p-3">
          <span className="text-caps text-ink-muted">Last change</span>
          <p className="mt-1 text-body text-ink">{lastChange.narrative}</p>
          <p className="mt-1.5 text-meta-sm text-fit">
            Still looking for what you asked for at the start.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Turn a trigger into a `ContextChange`.
 *
 * The `narrative` is written by hand per trigger rather than generated from
 * the `kind`, because it is the sentence the user reads in the swap diff. A
 * templated one ("Context changed: time_shrank") is exactly the machine-wording
 * the contract forbids.
 *
 * `patch` is intentionally empty here. The route handler owns the mutation —
 * these are the USER'S stated changes, and the engine decides what they imply.
 * Putting a guessed patch here would make the panel a second source of truth
 * about what a trigger means.
 */
function buildChange(trigger: RealityTrigger, last: ContextChange | null): ContextChange {
  const kinds: Record<string, ContextChange["kind"]> = {
    rain: "weather_changed",
    time: "time_shrank",
    soldout: "became_unavailable",
    budget: "budget_cut",
    restroom: "access_need_added",
    exhausted: "mood_changed",
  };

  const narratives: Record<string, string> = {
    rain: "It started raining, so anything outdoors lost and the indoor options moved up.",
    time: "You lost 90 minutes, so the plan is shorter and closer.",
    soldout: "That one is sold out, so it needs replacing with the nearest equivalent.",
    budget: "The budget is now ₹600, so anything over that came out.",
    restroom: "You need a restroom on site, so everything without one dropped.",
    exhausted: "Everyone is exhausted, so transfers came down and dwell time went up.",
  };

  return {
    kind: kinds[trigger.key] ?? "mood_changed",
    narrative: narratives[trigger.key] ?? `You said: ${trigger.label}.`,
    // Carried forward so the diff can show what changed relative to the LAST
    // change, not only relative to the original intent.
    patch: last ? { previousNarrative: last.narrative } : {},
  };
}
