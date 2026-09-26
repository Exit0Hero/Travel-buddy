"use client";

import { useCallback, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";

import type { Experience, Plan } from "@/contracts";

import { cn } from "@/components/cn";
import { Card } from "@/components/ui/Card";
import {
  CardMapCoupling,
  ClusterLayer,
  MapCanvas,
  RouteLine,
} from "@/components/map";

export interface MapPanelProps {
  experiences: ReadonlyArray<Experience>;
  plan: Plan;
  experienceById: ReadonlyMap<string, Experience>;
  /** The id just clicked on a card. Drives the reveal. */
  revealedId: string | null;
  selectedIds: ReadonlyArray<string>;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * The map, with the card coupling wired in.
 *
 * This component exists mostly to own the `MapRef` and hand it to the three
 * layers that need it. MapLibre attaches sources and layers imperatively, so
 * the map instance has to reach the layers through a ref rather than through
 * props, and keeping that plumbing in one place is what stops the layers from
 * each fetching their own.
 */
export function MapPanel({
  experiences,
  plan,
  experienceById,
  revealedId,
  selectedIds,
  onSelect,
  className,
}: MapPanelProps) {
  const [mapRef, setMapRef] = useState<MapRef | null>(null);

  /**
   * The join the contract forces. `PlanStop` has an `experienceId` but no
   * location, so both the route line and the card reveal have to resolve an id
   * back to coordinates.
   */
  const resolvePoint = useCallback(
    (id: string) => experienceById.get(id)?.location ?? null,
    [experienceById],
  );

  return (
    <Card padding="none" className={cn("overflow-hidden", className)}>
      <div className="relative size-full">
        <MapCanvas
          initialCentre={experienceById.get(selectedIds[0] ?? "")?.location ?? undefined}
          onMapReady={setMapRef}
          className="size-full"
        />

        {mapRef ? (
          <>
            <ClusterLayer
              experiences={experiences}
              selectedIds={selectedIds}
              onSelect={onSelect}
              mapRef={mapRef}
            />
            <RouteLine plan={plan} mapRef={mapRef} resolvePoint={resolvePoint} />
            <CardMapCoupling
              mapRef={mapRef}
              revealedId={revealedId}
              resolvePoint={resolvePoint}
            />
          </>
        ) : null}

        {/*
          A permanent note that the map is not the accessible path. DESIGN_SYSTEM
          §5 is blunt about it: the map is not keyboard-navigable and pretending
          otherwise is worse than not shipping it, so the list view is the
          first-class alternative and this says which one you are looking at.
        */}
        <p className="pointer-events-none absolute bottom-2 left-2 rounded-sm bg-surface px-2 py-1 text-meta-sm text-ink-muted">
          Every place here is also on the list
        </p>
      </div>
    </Card>
  );
}
