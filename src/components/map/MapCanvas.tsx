"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Ref } from "react";
import type { MapRef } from "react-map-gl/maplibre";

import type { GeoPoint } from "@/contracts";

import { cn } from "../cn";

/**
 * MapCanvas — MapLibre over OpenFreeMap. No API key, no account, no billing.
 *
 * The performance rules below are not preferences. Each one is a specific
 * failure documented in maplibre-gl-js's own source, and each was read there
 * rather than inferred:
 *
 *  - `circle` layers at ALL zooms. One instanced quad per point, no placement
 *    pass. `symbol` is only for the <= 20 live labels; a symbol layer over
 *    hundreds of points runs the collision detector on every frame.
 *  - `cluster: true` disables partial tile reload ENTIRELY
 *    (geojson_source.ts:575-577). So a clustered source and a live-hit source
 *    must be SEPARATE sources, or the clustered one loses its `updateData`
 *    fast path and every pan refetches everything.
 *  - Hit-test `circle`, never `symbol`: collision-hidden symbols are not
 *    queryable, so a click silently misses.
 *  - `promoteId`, NOT `generateId`. `generateId` assigns fresh ids on every
 *    `setData`, which destroys hover and selection state mid-interaction.
 *  - De-dup `e.features` by id. Tile buffering guarantees duplicates, so an
 *    un-deduped click handler fires two or three times for one tap.
 *  - Cluster counts as HTML, never glyphs — raster basemaps and blocked glyph
 *    endpoints make glyph clusters unreliable (AdventureLog
 *    FullMap.svelte:313-352 says so in a comment worth reading).
 */

/** OpenFreeMap. Keyless, vector, no usage cap we have to reason about. */
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Mumbai. Overridden by `initialCentre` when the caller has a real context. */
const FALLBACK_CENTRE: GeoPoint = { lat: 18.9388, lon: 72.8354 };

/**
 * The dynamically-imported `Map`, typed to accept a ref.
 *
 * `react-map-gl`'s `Map` is a `forwardRef` component whose ref resolves to its
 * own `MapRef` wrapper — the object that carries `getMap()`, `getCenter()`,
 * `flyTo()` and the rest. That wrapper is NOT the `maplibregl.Map` underneath
 * it, and the distinction is the whole reason this type exists.
 */
type MapComponent = React.ComponentType<{
  ref?: Ref<MapRef | null>;
  [prop: string]: unknown;
}>;

export interface MapCanvasProps {
  initialCentre?: GeoPoint;
  initialZoom?: number;
  className?: string;
  /** Receives the live map instance. The layers attach to this. */
  onMapReady?: (map: MapRef) => void;
  /**
   * The map is not keyboard-navigable and pretending otherwise is worse than
   * not shipping it (DESIGN_SYSTEM §5). So the list is the first-class
   * alternative and this flag only controls whether the canvas itself is
   * reachable — it is never the only way to act on a place.
   */
  interactive?: boolean;
}

export function MapCanvas({
  initialCentre = FALLBACK_CENTRE,
  initialZoom = 12,
  className,
  onMapReady,
  interactive = true,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [Map, setMap] = useState<MapComponent | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const reportedRef = useRef<MapRef | null>(null);

  /*
    WHY A CALLBACK REF *AND* `onLoad`. Two different facts, two different hooks.

    This previously read the map out of a MapLibre load event:

        onLoad={(event) => { mapRef.current = event.target as MapRef; }}

    `event.target` there is the raw `maplibregl.Map`, not react-map-gl's `MapRef`
    wrapper. The `as MapRef` cast satisfied the compiler and lied at runtime, and
    the first consumer to call `mapRef.getMap()` — `ClusterLayer` on mount —
    threw `mapRef.getMap is not a function` and took the whole page down with
    it. The cast is what hid it: a ref handed over by the component itself
    cannot be the wrong shape. So the instance now arrives via `ref`.

    But the ref resolves as soon as the component mounts, which is *before* the
    style finishes loading, and the layers call `addSource` the moment they are
    handed a map. Announcing readiness from the ref alone therefore fails the
    other way with `Style is not done loading`. So readiness stays on `load`,
    which is what the prop has always claimed to mean, and it now forwards the
    ref-captured instance.

    `reportedRef` keeps `onMapReady` to one call per instance.
  */
  const attachMap = useCallback((instance: MapRef | null) => {
    if (instance) mapRef.current = instance;
  }, []);

  const announceMap = useCallback(() => {
    const instance = mapRef.current;
    if (!instance || reportedRef.current === instance) return;
    reportedRef.current = instance;
    onMapReady?.(instance);
  }, [onMapReady]);

  useEffect(() => {
    // `react-map-gl/maplibre` is loaded client-side only. Importing it at the
    // top of the module pulls maplibre-gl into the server bundle, which fails
    // on its worker and WebGL assumptions.
    let cancelled = false;
    void import("react-map-gl/maplibre").then((mod) => {
      if (cancelled) return;
      const Component = (mod.default ?? mod.Map) as MapComponent;
      setMap(() => Component);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Map) {
    // Structural skeleton, same box as the real canvas. A spinner here would
    // collapse to nothing and shove the whole layout sideways on load.
    return (
      <div
        aria-hidden
        className={cn("size-full rounded-md bg-accent-soft", className)}
      />
    );
  }

  return (
    <div ref={containerRef} className={cn("relative size-full overflow-hidden", className)}>
      <Map
        // Keyless style. No token, no account, nothing to leak.
        mapStyle={STYLE_URL}
        initialViewState={{
          longitude: initialCentre.lon,
          latitude: initialCentre.lat,
          zoom: initialZoom,
        }}
        interactive={interactive}
        // The map is decorative for assistive tech; the list carries the same
        // information and is the accessible path.
        aria-hidden="true"
        // Reuse the canvas across renders — recreating it on every parent
        // render is the single biggest cause of jank in a map this small.
        reuseMaps
        ref={attachMap}
        onLoad={announceMap}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

/**
 * De-duplicate a MapLibre query result.
 *
 * Tile buffering means a point near a tile boundary is returned by more than
 * one tile, so `e.features` legitimately contains the same feature twice or
 * three times. Un-deduped, one tap fires three handlers and the coupling
 * animation runs three times.
 */
export function dedupeFeatures<T extends { properties?: { id?: string | number } | null }>(
  features: ReadonlyArray<T>,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const feature of features) {
    const id = feature.properties?.id;
    const key = id === undefined || id === null ? JSON.stringify(feature) : String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(feature);
  }
  return out;
}
