"use client";

import { ArrowRight, Footprints, Car, Train, Ship } from "lucide-react";

import type { TravelLeg } from "@/contracts";

import { cn } from "../cn";
import { Button } from "../ui/Button";
import { minutesToClock, metresToDistance } from "./format";

/**
 * TravelConnector — the pattern that makes a plan read as a JOURNEY.
 *
 * It is a HAIRLINE SIBLING of the stop list, not a property of a stop. That
 * distinction is structural: the leg is a real edge between two nodes, so it
 * belongs between them in the DOM. Rendering it inside the stop means a screen
 * reader announces the walk as part of the place you are arriving at, and the
 * journey stops being legible as a sequence. From TREK
 * client/src/components/Planner/DayPlanSidebarRouteConnector.tsx:14-36.
 *
 * `estimated: true` legs render differently from live ones. The contract
 * carries that flag precisely so we can be honest about which numbers came off
 * a router and which are our model. Hiding that distinction would make a
 * modelled 12 minutes indistinguishable from a routed 12 minutes, and the
 * whole product is a claim about accuracy.
 */
export interface TravelConnectorProps {
  leg: TravelLeg;
  /** Arrives at the next stop. Printed on the line, mono. */
  arriveAtMin?: number;
  /** Opens the mode switcher. Omit for a static connector. */
  onChangeMode?: (leg: TravelLeg) => void;
  className?: string;
}

const MODE_ICON = {
  walk: Footprints,
  auto: Car,
  transit: Train,
  ferry: Ship,
} as const;

const MODE_LABEL = {
  walk: "walk",
  auto: "drive",
  transit: "transit",
  ferry: "ferry",
} as const;

export function TravelConnector({
  leg,
  arriveAtMin,
  onChangeMode,
  className,
}: TravelConnectorProps) {
  const Icon = MODE_ICON[leg.mode];
  const content = (
    <>
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
      <span className="text-num-sm font-medium text-ink">
        {leg.minutes} min {MODE_LABEL[leg.mode]}
      </span>
      {/* Decorative separator. ink-faint is for exactly this: punctuation
          that carries no information. Every value on this row is ink-muted
          or darker, because the values are the content. */}
      <span aria-hidden className="text-ink-faint">
        ·
      </span>
      <span className="text-num-sm text-ink-muted">{metresToDistance(leg.metres)}</span>
      {leg.detail ? (
        <>
          <span aria-hidden className="text-ink-faint">
            ·
          </span>
          <span className="truncate text-meta-sm text-ink-muted">{leg.detail}</span>
        </>
      ) : null}
      {arriveAtMin !== undefined ? (
        <span className="ml-auto shrink-0 text-num-sm text-ink-muted">
          {minutesToClock(arriveAtMin)}
        </span>
      ) : null}
    </>
  );

  return (
    <div className={cn("flex items-stretch gap-2", className)}>
      {/* The hairline. aria-hidden because the row already says all of this. */}
      <div aria-hidden className="flex w-4 shrink-0 flex-col items-center">
        <span className="h-2 w-px bg-rule" />
        <span className="flex flex-1 items-center">
          <span className="h-full w-px border-l border-dashed border-rule" />
        </span>
      </div>

      <div className="min-w-0 flex-1 py-1.5">
        {onChangeMode ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChangeMode(leg)}
            className="h-auto min-h-9 w-full justify-start gap-1.5 px-2 py-1 hover:bg-accent-soft"
            iconRight={<ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />}
          >
            <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-left">{content}</span>
          </Button>
        ) : (
          <div className="flex min-w-0 items-center gap-1.5 px-2 py-1.5">{content}</div>
        )}

        {/*
          Estimated legs say so. A modelled number presented identically to a
          routed one is a claim we cannot support, and this is the cheapest
          place in the UI to be honest about it.
        */}
        {leg.estimated ? (
          <p className="px-2 text-meta-sm text-ink-muted">Estimated for this time of day</p>
        ) : null}
      </div>
    </div>
  );
}
