import type { ReactNode } from "react";

import { cn } from "../cn";

/**
 * Skeletons are STRUCTURAL COPIES of the real thing, not a spinner.
 *
 * Two failure modes this file exists to avoid:
 *  - a spinner tells the user nothing about what is arriving, so the layout
 *    they are looking at is a lie until the data lands
 *  - a skeleton whose box differs from the content it replaces causes a layout
 *    shift on every single load, which is worse than showing nothing
 *
 * So each pattern below mirrors the real component's box: same line heights,
 * same segment widths, same borders. When the real component changes its
 * structure, change the matching pattern in the same commit.
 */

/** One grey block. Never a spinner, never a pulsing dot. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-sm bg-accent-soft", className)}
    />
  );
}

/**
 * The skeleton root. `aria-busy` plus a live region is what makes this
 * announced; the visuals alone are silent to a screen reader.
 *
 * The minimum hold is --skeleton-min (150ms). Below that, a fast response
 * flashes a loading state that the user barely registers and the DOM thrashes
 * for no benefit. The delay is applied by the parent that knows when the data
 * actually resolved, not here — a skeleton cannot know.
 */
export function SkeletonRoot({
  children,
  className,
  label = "Loading",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("animate-pulse", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">
        {label}
      </span>
      {children}
    </div>
  );
}

/** A two-line text block: one full-width line, one 60%. */
export function SkeletonText({ lines = 2, className }: { lines?: 1 | 2 | 3; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 && lines > 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
   The 8 patterns. Each maps to one real component.
   ------------------------------------------------------------------------- */

/** 1. ResultCard — the 8-part order, same box. */
export function ResultCardSkeleton() {
  return (
    <SkeletonRoot label="Loading result" className="rounded-md border border-rule bg-surface p-4">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="mt-2 h-3 w-1/3" />
      <Skeleton className="mt-3 h-3 w-1/2" />
      <Skeleton className="mt-2 h-3 w-2/3" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonText lines={2} className="mt-3" />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-11 w-full rounded-md" />
    </SkeletonRoot>
  );
}

/** 2. PlanStop — a stop in the vertical timeline. */
export function PlanStopSkeleton() {
  return (
    <SkeletonRoot label="Loading stop" className="py-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-3 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    </SkeletonRoot>
  );
}

/** 3. FitMeter — same three segments and the same overflow tail. */
export function FitMeterSkeleton() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

/** 4. TravelConnector — the hairline sibling, with its label block. */
export function TravelConnectorSkeleton() {
  return (
    <div className="flex items-center gap-2 py-1 pl-1">
      <Skeleton className="h-8 w-px" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

/** 5. TimeBudgetBar — block count driven, same height. */
export function TimeBudgetBarSkeleton() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className="h-6 w-full" />
    </div>
  );
}

/** 6. StressRadar — seven labelled bars, the real count. */
export function StressRadarSkeleton() {
  return (
    <SkeletonRoot label="Loading stress" className="space-y-2">
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 flex-1" />
        </div>
      ))}
    </SkeletonRoot>
  );
}

/** 7. LedgerRow — one `why this` / `why not that` sentence. */
export function LedgerRowSkeleton() {
  return (
    <div className="flex items-start gap-2 py-2">
      <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/** 8. ResultList — n cards, the loading state for the whole surface. */
export function ResultListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">Loading {count} results</span>
      {Array.from({ length: count }, (_, i) => (
        <ResultCardSkeleton key={i} />
      ))}
    </div>
  );
}

export const SKELETON_PATTERNS = {
  resultCard: ResultCardSkeleton,
  planStop: PlanStopSkeleton,
  fitMeter: FitMeterSkeleton,
  travelConnector: TravelConnectorSkeleton,
  timeBudgetBar: TimeBudgetBarSkeleton,
  stressRadar: StressRadarSkeleton,
  ledgerRow: LedgerRowSkeleton,
  resultList: ResultListSkeleton,
} as const;

export type SkeletonPattern = keyof typeof SKELETON_PATTERNS;
