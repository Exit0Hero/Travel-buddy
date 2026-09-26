import type { Plan } from "@/contracts";

import { cn } from "../cn";
import { minutesToDuration } from "./format";

/**
 * TimeBudgetBar — the window as COUNTABLE BLOCKS, not a vague bar.
 *
 * The mask is the whole idea. A proportional bar communicates "some fraction"
 * and a traveller cannot act on a fraction; a bar cut into one block per 30
 * minutes communicates "you have four of these", which is a decision they can
 * make. Borrowed from TREK client/src/components/Roadtrip/RangeStrip.tsx:57-72.
 *
 * It is a real MASK, not painted stripes:
 *   `repeating-linear-gradient` with `mask-image` punches actual holes through
 *   the bar, so the gaps show the canvas behind. A stripe drawn in a lighter
 *   colour would read as a fifth segment and quietly corrupt the count.
 *
 * The overrun tail is hatched for the same reason in reverse — a solid red
 * block would look like more budget rather than less.
 */
export interface TimeBudgetBarProps {
  /** Minutes the traveller has. Drives the block count. */
  availableMin: number;
  /** Minutes the plan consumes. Over `availableMin` is the hatched tail. */
  plannedMin: number;
  /** One block per this many minutes. 30 by design. */
  blockMin?: number;
  /** Optional per-stop boundaries, drawn as ticks. */
  stopBoundariesMin?: ReadonlyArray<number>;
  label?: string;
  className?: string;
}

export function TimeBudgetBar({
  availableMin,
  plannedMin,
  blockMin = 30,
  stopBoundariesMin,
  label,
  className,
}: TimeBudgetBarProps) {
  const safeAvailable = Math.max(blockMin, availableMin);
  const blockCount = Math.max(1, Math.round(safeAvailable / blockMin));

  // Clamped to the track. An overrun longer than the window is still one
  // hatched tail, not a bar that pushes the layout sideways.
  const within = Math.min(plannedMin, safeAvailable);
  const overrun = Math.max(0, plannedMin - safeAvailable);

  const usedPercent = (within / safeAvailable) * 100;
  const overrunPercent = Math.min(100 - usedPercent, (overrun / safeAvailable) * 100);
  const hasOverrun = overrun > 0;

  // How many whole blocks are consumed, for the readable summary.
  const blocksUsed = Math.floor(within / blockMin);
  const partial = within % blockMin > 0;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-meta-sm text-ink-muted">{label ?? "Time budget"}</span>
        <span className="text-num-sm text-ink">
          {minutesToDuration(plannedMin)}
          <span className="text-ink-muted"> of {minutesToDuration(availableMin)}</span>
        </span>
      </div>

      <div
        className="relative mt-1.5 h-6 w-full"
        role="img"
        aria-label={
          `${minutesToDuration(plannedMin)} planned of ${minutesToDuration(availableMin)} available, ` +
          `in ${blockMin} minute blocks.` +
          (hasOverrun ? ` Over by ${minutesToDuration(overrun)}.` : "")
        }
      >
        {/* Track: the holes are cut out of this, so canvas shows through. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-accent-soft"
          style={{
            WebkitMaskImage: `repeating-linear-gradient(to right, var(--mask-solid) 0, var(--mask-solid) ${100 / blockCount}%, transparent ${100 / blockCount}%, transparent 100%)`,
            maskImage: `repeating-linear-gradient(to right, var(--mask-solid) 0, var(--mask-solid) ${100 / blockCount}%, transparent ${100 / blockCount}%, transparent 100%)`,
            maskSize: `${100 / blockCount}% 100%`,
          }}
        />

        {/* Consumed portion, same mask so the block rhythm is continuous. */}
        {usedPercent > 0 ? (
          <div
            aria-hidden
            className={cn(
              "absolute inset-y-0 left-0",
              hasOverrun ? "bg-warn" : "bg-accent",
            )}
            style={{
              width: `${usedPercent}%`,
              WebkitMaskImage: `repeating-linear-gradient(to right, var(--mask-solid) 0, var(--mask-solid) ${100 / blockCount}%, transparent ${100 / blockCount}%, transparent 100%)`,
              maskImage: `repeating-linear-gradient(to right, var(--mask-solid) 0, var(--mask-solid) ${100 / blockCount}%, transparent ${100 / blockCount}%, transparent 100%)`,
              maskSize: `${100 / blockCount}% 100%`,
            }}
          />
        ) : null}

        {/* Overrun: hatched, so it reads as "past the edge" not "more". */}
        {hasOverrun ? (
          <div
            aria-hidden
            className="absolute inset-y-0 bg-alarm"
            style={{
              left: `${usedPercent}%`,
              width: `${Math.max(overrunPercent, 1.5)}%`,
              maskImage:
                "repeating-linear-gradient(45deg, var(--mask-solid) 0, var(--mask-solid) 3px, transparent 3px, transparent 6px)",
              WebkitMaskImage:
                "repeating-linear-gradient(45deg, var(--mask-solid) 0, var(--mask-solid) 3px, transparent 3px, transparent 6px)",
            }}
          />
        ) : null}

        {/* Stop boundaries, as ticks inside the track. */}
        {stopBoundariesMin && stopBoundariesMin.length > 0 ? (
          <div aria-hidden className="absolute inset-0">
            {stopBoundariesMin.map((minute) => {
              const at = (minute / safeAvailable) * 100;
              if (at <= 0 || at >= 100) return null;
              return (
                <span
                  key={minute}
                  className="absolute inset-y-0 w-px bg-surface"
                  style={{ left: `${at}%` }}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      {/*
        The count in words. This is the line that makes the bar actionable —
        "2h 05m of 2h 30m, 3 of 5 blocks" is a decision; a gradient is not.
      */}
      <p className="mt-1 text-meta-sm text-ink-muted">
        {blocksUsed}
        {partial ? "+" : ""} of {blockCount} {blockMin}-minute blocks
        {hasOverrun ? (
          <span className="text-alarm"> — over by {minutesToDuration(overrun)}</span>
        ) : null}
      </p>
    </div>
  );
}

/** Convenience wrapper for the plan-level bar, reading the two Plan fields. */
export function PlanTimeBudgetBar({
  plan,
  className,
}: {
  plan: Plan;
  className?: string;
}) {
  const boundaries = plan.stops.map((stop) => stop.arriveMin).filter((minute) => minute > 0);

  return (
    <TimeBudgetBar
      availableMin={Math.max(plan.totalMin, deriveAvailable(plan))}
      plannedMin={plan.totalMin}
      stopBoundariesMin={boundaries}
      className={className}
    />
  );
}

/**
 * The plan does not carry `availableMin` — it lives on the context. This
 * derives the denominator from utilisation, which is defined in the contract
 * as plannedMin / availableMin, so this is a division rather than an estimate.
 */
function deriveAvailable(plan: Plan): number {
  if (!Number.isFinite(plan.utilisation) || plan.utilisation <= 0) return plan.totalMin;
  return Math.round(plan.totalMin / plan.utilisation);
}
