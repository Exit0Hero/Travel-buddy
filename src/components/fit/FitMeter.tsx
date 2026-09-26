"use client";

import { useEffect, useState } from "react";

import type { Fit } from "@/contracts";

import { cn } from "../cn";
import { minutesToDuration } from "./format";

/**
 * FitMeter — the thesis made visual. This is the ONE place boldness is spent;
 * everything around it stays quiet (DESIGN_SYSTEM §1).
 *
 * Renders `Fit` directly and computes nothing. Three segments proportional to
 * activity, travel and buffer, measured against `availableMin`, with the
 * overflow past 100% drawn in `alarm`.
 *
 * Two decisions that are not obvious:
 *
 * 1. The bar FILLS AND GOES RED as an option stops fitting, animated on
 *    --ease-feedback. That overshoot curve is what the token is for. This is
 *    the one place in the app where motion is load-bearing: the user is
 *    watching a number cross a threshold and the animation is the feedback.
 *
 * 2. `verdict: 'tight'` gets a `warn` hairline, NOT red. Red is reserved for
 *    genuinely infeasible. If everything slightly-over gets the alarm colour
 *    then alarm stops meaning anything, and the one signal worth having is
 *    the one the user learns to ignore.
 */
export interface FitMeterProps {
  fit: Fit;
  /** Compact form for a card: no legend row, shorter. */
  compact?: boolean;
  /** Show the per-constraint check list underneath. Off by default — it is
   *  the second tap of "why this", not the first impression. */
  showChecks?: boolean;
  className?: string;
}

type Verdict = Fit["verdict"];

const VERDICT_TONE: Record<Verdict, { text: string; border: string; label: string }> = {
  fits: { text: "text-fit", border: "border-fit", label: "Fits" },
  tight: { text: "text-warn", border: "border-warn", label: "Tight" },
  does_not_fit: { text: "text-alarm", border: "border-alarm", label: "Does not fit" },
};

/**
 * The three segments, in the order the header legend prints them.
 * Buffer is last because it is the part that gives first.
 */
const SEGMENTS = [
  { key: "activityMin", label: "activity", tone: "bg-accent" },
  { key: "travelMin", label: "travel", tone: "bg-info" },
  { key: "bufferMin", label: "buffer", tone: "bg-accent-soft" },
] as const;

export function FitMeter({ fit, compact = false, showChecks = false, className }: FitMeterProps) {
  const tone = VERDICT_TONE[fit.verdict];
  const total = fit.totalMin;
  const available = Math.max(1, fit.availableMin);
  const overflowMin = Math.max(0, total - available);

  // The overflow is drawn as a share of the FULL bar, so a plan that is 150%
  // over shows a red tail across the whole track rather than an off-screen
  // sliver the user cannot see. Capped so the layout cannot be pushed out by
  // a pathological value.
  const overflowPercent = Math.min(100, (overflowMin / available) * 100);
  const fitsPercent = Math.min(100, (Math.min(total, available) / available) * 100);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2">
        {!compact ? (
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-meta-sm text-ink-muted">
            {SEGMENTS.map((segment) => (
              <li key={segment.key} className="flex items-center gap-1">
                <span aria-hidden className={cn("size-2 rounded-full", segment.tone)} />
                {segment.label}
              </li>
            ))}
          </ul>
        ) : null}
        <span className={cn("text-num-sm shrink-0 font-medium", tone.text)}>
          {minutesToDuration(fit.availableMin)} left
        </span>
      </div>

      {/*
        The track is a plain div with two children rather than a gradient, so
        the segment boundaries are real edges the eye can count. `overflowMin`
        is the red tail, clipped by the track's overflow.
      */}
      <div
        className={cn(
          "relative mt-1.5 h-3 w-full overflow-hidden rounded-pill bg-accent-soft",
          fit.verdict === "tight" && "ring-1 ring-inset ring-warn",
        )}
        role="img"
        aria-label={
          `${tone.label}. ${minutesToDuration(fit.activityMin)} activity, ` +
          `${minutesToDuration(fit.travelMin)} travel, ${minutesToDuration(fit.bufferMin)} buffer, ` +
          `against ${minutesToDuration(fit.availableMin)} available.` +
          (overflowMin > 0 ? ` Over by ${minutesToDuration(overflowMin)}.` : "")
        }
      >
        <FittingBar fit={fit} percent={fitsPercent} overflowPercent={overflowPercent} />
      </div>

      {/*
        The text verdict is not optional. DESIGN_SYSTEM §5: colour is never the
        only signal. A reader who cannot distinguish alarm from warn still gets
        the whole answer here.
      */}
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className={cn("text-meta-sm font-medium", tone.text)}>{tone.label}</span>
        <span className="text-num-sm text-ink-muted">
          {minutesToDuration(total)} of {minutesToDuration(fit.availableMin)}
        </span>
      </div>

      {showChecks && fit.checks.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {fit.checks.map((check) => (
            <li key={check.label} className="flex items-start gap-1.5 text-meta-sm">
              <span
                aria-hidden
                className={cn("mt-0.5 font-data leading-none", check.pass ? "text-fit" : "text-alarm")}
              >
                {check.pass ? "✓" : "✗"}
              </span>
              <span className="min-w-0">
                <span className={check.pass ? "text-ink-muted" : "text-alarm"}>{check.label}</span>
                {check.detail ? (
                  <span className="text-ink-muted"> — {check.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * The animated inner bar, split out so the entrance transition mounts once.
 *
 * Animating width from 0 on mount rather than transitioning it is deliberate:
 * the point is to show the user how the option consumes their window, and a
 * bar that is already full when it appears tells them nothing.
 */
function FittingBar({
  fit,
  percent,
  overflowPercent,
}: {
  fit: Fit;
  percent: number;
  overflowPercent: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // A frame's delay so the browser has a zero-width starting value to
    // animate away from. Without it there is no transition at all.
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const width = mounted ? `${percent}%` : "0%";
  const overflowWidth = mounted && overflowPercent > 0 ? `${overflowPercent}%` : "0%";

  const shares = SEGMENTS.map((segment) => {
    const value = fit[segment.key];
    const share = fit.totalMin > 0 ? (value / fit.totalMin) * percent : 0;
    return { ...segment, share };
  });

  return (
    <div className="absolute inset-0 flex">
      <div
        className="flex h-full min-w-0"
        style={{
          width,
          transition: "width var(--dur-feedback) var(--ease-feedback)",
        }}
      >
        {shares.map((segment) => (
          <div
            key={segment.key}
            className={cn("h-full first:rounded-l-pill last:rounded-r-pill", segment.tone)}
            style={{ width: `${segment.share}%` }}
          />
        ))}
      </div>
      {overflowPercent > 0 ? (
        <div
          className="h-full bg-alarm"
          style={{
            width: overflowWidth,
            transition: "width var(--dur-feedback) var(--ease-feedback)",
          }}
        />
      ) : null}
    </div>
  );
}
