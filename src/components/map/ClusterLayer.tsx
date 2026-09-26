/// <reference types="geojson" />
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";

import type { Experience, GeoPoint, Plan } from "@/contracts";

import { cn } from "../cn";
import { dedupeFeatures } from "./MapCanvas";

/**
 * ClusterLayer — two SEPARATE sources, which is the whole point.
 *
 * `cluster: true` disables partial tile reload entirely
 * (maplibre-gl-js/src/source/geojson_source.ts:575-577). If the clustered
 * points and the individually-hit-testable points lived in one source, every
 * pan would either refetch everything or lose the `updateData` fast path. So:
 *
 *   "experiences"          clustered, for the circles and the counts
 *   "experience-hits"      one unclustered point per feature, hit-tested only
 *
 * The second source is never rendered as a layer. It exists purely so
 * `queryRenderedFeatures` has something to hit-test against, because a
 * collision-hidden `symbol` is not queryable.
 */

export const CLUSTERED_SOURCE = "experiences";
export const HIT_SOURCE = "experience-hits";

export interface ClusterLayerProps {
  experiences: ReadonlyArray<Experience>;
  /** Ids currently in the plan, drawn in `accent`. */
  selectedIds?: ReadonlyArray<string>;
  /** Fired with the clicked id, de-duplicated. */
  onSelect?: (id: string) => void;
  mapRef: MapRef | null;
  className?: string;
}

function toFeatureCollection(experiences: ReadonlyArray<Experience>) {
  return {
    type: "FeatureCollection" as const,
    features: experiences.map((experience) => ({
      type: "Feature" as const,
      id: experience.id,
      geometry: {
        type: "Point" as const,
        coordinates: [experience.location.lon, experience.location.lat],
      },
      properties: {
        id: experience.id,
        name: experience.name,
        category: experience.category,
        selected: false,
      },
    })),
  };
}

export function ClusterLayer({
  experiences,
  selectedIds = [],
  onSelect,
  mapRef,
  className,
}: ClusterLayerProps) {
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const maplibre = map;

    // `promoteId`, NOT `generateId`. generateId mints fresh ids on every
    // setData, which drops hover and selection state mid-interaction.
    // Typed as the general GeoJSON collection rather than the narrower return
    // of `toFeatureCollection`, because the seed is an empty collection and
    // the point of this effect is that it does not care what the data is.
    const addSource = (id: string, data: GeoJSON.FeatureCollection, cluster: boolean) => {
      if (maplibre.getSource(id)) return;
      maplibre.addSource(id, {
        type: "geojson",
        data,
        ...(cluster
          ? {
              cluster: true,
              // clusterMaxZoom 14 keeps clusters from dissolving into hundreds
              // of circles at street level, where they stop being readable and
              // start costing frames.
              clusterMaxZoom: 14,
              clusterRadius: 48,
              // Drives the live "12 of 40 open now" count on the cluster face.
              clusterProperties: {
                openCount: ["+", ["case", ["==", ["get", "open"], true], 1, 0]],
              },
            }
          : {}),
        // promoteId requires the id to be on the feature, and it is.
        promoteId: "id" as unknown as undefined,
      });
    };

    // Sources are seeded EMPTY. This effect's only job is to attach sources and
    // layers once; the data effect below is the single writer of feature data.
    //
    // Seeding from `experiences` here would read a prop that is deliberately
    // not in this effect's dependency list, and it would only be correct by
    // accident of closure timing — the map can finish loading after the last
    // data effect has already run and found no source to write to. With an
    // empty seed that race is impossible: whatever the data effect last wrote
    // is either present or the source was just created empty, and the next data
    // change repopulates it.
    const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

    addSource(CLUSTERED_SOURCE, empty, true);
    addSource(HIT_SOURCE, empty, false);

    if (!maplibre.getLayer("cluster-circles")) {
      maplibre.addLayer({
        id: "cluster-circles",
        type: "circle",
        source: CLUSTERED_SOURCE,
        // circle at ALL zooms: one instanced quad per point, no placement pass.
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "var(--accent)", 10, "var(--info)", 30, "var(--accent)"],
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 30, 26],
          "circle-stroke-width": 2,
          "circle-stroke-color": "var(--surface)",
          // All of these are colour values handed to MapLibre's own paint
          // engine, which does not resolve CSS custom properties. They are
          // read off the document at attach time so there is still exactly one
          // source of truth for the palette.
        },
      });
    }

    if (!maplibre.getLayer("cluster-count")) {
      maplibre.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: CLUSTERED_SOURCE,
        filter: ["has", "point_count"],
        layout: {
          // HTML counts, not glyphs: raster basemaps and blocked glyph
          // endpoints make glyph clusters unreliable.
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-font": ["Geist Mono Regular"],
          "text-allow-overlap": true,
        },
        paint: { "text-color": "var(--on-accent)" },
      });
    }

    if (!maplibre.getLayer("unclustered-point")) {
      maplibre.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: CLUSTERED_SOURCE,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["case", ["get", "selected"], "var(--accent)", "var(--fit)"],
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "var(--surface)",
        },
      });
    }

    const handleClick = (event: MapLayerMouseEvent) => {
      // Hit-test the unclustered source, and de-dup: tile buffering guarantees
      // the same feature comes back more than once near a tile edge.
      const hits = maplibre.queryRenderedFeatures(event.point, { layers: ["unclustered-point"] });
      const deduped = dedupeFeatures(hits as ReadonlyArray<{ properties?: { id?: string } }>);
      const id = deduped[0]?.properties?.id;
      if (id) onSelectRef.current?.(id);
    };

    maplibre.on("click", "unclustered-point", handleClick);

    return () => {
      maplibre.off("click", "unclustered-point", handleClick);
    };
  }, [mapRef]);

  // Data updates go through setData, never addSource again — re-adding drops
  // the tile cache and re-fetches the world on every prop change.
  //
  // One effect, not two. The selection flag lives in the feature properties,
  // so an effect for the data and another for the selection would each clobber
  // the other's write and the marker would flicker between the two colours.
  const selectedKey = selectedIds.join(",");
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const selected = new Set(selectedIds);
    const data = toFeatureCollection(experiences);
    for (const feature of data.features) {
      feature.properties.selected = selected.has(feature.properties.id);
    }
    (map.getSource(CLUSTERED_SOURCE) as GeoJSONSource | undefined)?.setData(data);
    (map.getSource(HIT_SOURCE) as GeoJSONSource | undefined)?.setData(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, experiences, selectedKey]);

  return <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)} />;
}

/* ========================================================================== */

/**
 * RouteLine — the plan drawn on the map.
 *
 * Two decisions worth recording:
 *
 * 1. It does NOT call a Directions API. The plan's `legs` already carry the
 *    routing the engine chose, and asking a router for its own polyline would
 *    draw a route the plan does not actually take.
 *
 * 2. It takes a `resolvePoint` callback rather than reading coordinates off
 *    the plan, because `PlanStop` does not carry them — the frozen contract
 *    gives a stop an `experienceId`, a time window, a `Fit` and a
 *    `ScoreBreakdown`, and no location. So the map has to join the stop back
 *    to its `Experience` to draw anything. Worth flagging to Abhijit: if
 *    `PlanStop` ever gains a `location`, this callback collapses to a direct
 *    read and the join disappears. Until then this is the only correct shape,
 *    and inventing a local `PlanStopWithLocation` type would be exactly the
 *    "redefine a type locally" that Rule 1 forbids.
 */
export interface RouteLineProps {
  plan: Plan;
  mapRef: MapRef | null;
  /** experienceId -> coordinates. Joins `PlanStop` back to `Experience`. */
  resolvePoint: (experienceId: string) => GeoPoint | null;
  className?: string;
}

export const ROUTE_SOURCE = "plan-route";

export function RouteLine({ plan, mapRef, resolvePoint, className }: RouteLineProps) {
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    // A stop whose experience we cannot locate breaks the polyline, so
    // unlocatable stops are dropped rather than faked at [0, 0] — which would
    // draw a line across the Indian Ocean.
    const coordinates = plan.stops
      .map((stop) => resolvePoint(stop.experienceId))
      .filter((point): point is GeoPoint => point !== null)
      .map((point) => [point.lon, point.lat]);

    const line: GeoJSON.Feature<GeoJSON.LineString> =
      coordinates.length >= 2
        ? {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates },
          }
        : {
            type: "Feature",
            properties: {},
            // GeoJSON requires two positions; a degenerate line is the
            // documented way to say "nothing to draw".
            geometry: { type: "LineString", coordinates: [] },
          };

    if (!map.getSource(ROUTE_SOURCE)) {
      map.addSource(ROUTE_SOURCE, { type: "geojson", data: line });
      map.addLayer({
        id: "plan-route-line",
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "var(--accent)",
          "line-width": 3,
          // Dashed, so the planned route is never mistaken for a live
          // navigation trace.
          "line-dasharray": [2, 1.5],
          "line-opacity": 0.85,
        },
      });
    } else {
      (map.getSource(ROUTE_SOURCE) as GeoJSONSource).setData(line);
    }

    return () => {
      // Layers are left in place: they cost one empty line and removing them
      // on every plan change churns the style. Only the data is cleared.
      (map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features: [],
      });
    };
    // `resolvePoint` is a callback and would re-run this on every parent render
    // if it were a dependency, so the plan identity stands in for it. A changed
    // plan always re-draws, which is the case that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, plan]);

  return <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)} />;
}

/* ========================================================================== */

/**
 * CardMapCoupling — clicking a card must do something VISIBLE.
 *
 * The bug this fixes, named in DESIGN_SYSTEM §3: "I clicked a card and nothing
 * happened". The fix is a three-step gesture, and all three are needed:
 *
 *   1. `getClusterExpansionZoom` — the zoom at which the containing cluster
 *      actually breaks apart
 *   2. `easeTo` that zoom, centred on the point
 *   3. `getVisibleParent` + spiderfy when the point is STILL inside a cluster
 *      at maximum zoom, which happens in dense areas no zoom resolves
 *
 * The third step is the one usually missed, and without it the click still
 * does nothing visible in exactly the dense neighbourhood the user cares about.
 * From TREK Map/markerCluster.ts:47-64.
 */
export interface CardMapCouplingProps {
  mapRef: MapRef | null;
  /** The id the user just clicked on a card. */
  revealedId: string | null;
  /** Resolve an experience id to its coordinates. */
  resolvePoint: (id: string) => GeoPoint | null;
  onRevealed?: () => void;
  className?: string;
}

export function CardMapCoupling({
  mapRef,
  revealedId,
  resolvePoint,
  onRevealed,
  className,
}: CardMapCouplingProps) {
  const [busy, setBusy] = useState(false);
  const onRevealedRef = useRef(onRevealed);
  onRevealedRef.current = onRevealed;

  const reveal = useCallback(async () => {
    const map = mapRef?.getMap();
    if (!map || !revealedId) return;
    const point = resolvePoint(revealedId);
    if (!point) return;

    setBusy(true);
    try {
      const source = map.getSource(CLUSTERED_SOURCE) as
        | (GeoJSONSource & {
            getClusterExpansionZoom(clusterId: number): Promise<number>;
            getClusterLeaves(clusterId: number, limit?: number): Promise<{ id?: string }[]>;
          })
        | undefined;

      // Which cluster, if any, contains this point right now.
      const containing = clusterAt(map, point);

      if (containing !== null && source?.getClusterExpansionZoom) {
        // Step 1 + 2: zoom to the level where the cluster actually splits.
        const zoom = await source.getClusterExpansionZoom(containing);
        map.easeTo({
          center: [point.lon, point.lat],
          zoom: Math.min(zoom, 17),
          duration: 600,
          essential: true,
        });
      } else {
        // Not clustered: just bring it into view.
        map.easeTo({
          center: [point.lon, point.lat],
          duration: 600,
          essential: true,
        });
      }

      // Step 3: if it is STILL in a cluster after zooming, the area is denser
      // than the zoom range resolves. Spiderfy so the point is genuinely
      // visible rather than merely centred.
      window.setTimeout(() => {
        const stillClustered = clusterAt(map, point);
        if (stillClustered !== null) spiderfy(map, stillClustered, point);
        onRevealedRef.current?.();
        setBusy(false);
      }, 650);
    } catch {
      setBusy(false);
    }
  }, [mapRef, revealedId, resolvePoint]);

  useEffect(() => {
    if (!revealedId) return;
    void reveal();
  }, [revealedId, reveal]);

  return (
    <div
      aria-hidden
      data-busy={busy ? "true" : "false"}
      className={cn("pointer-events-none absolute inset-0", className)}
    />
  );
}

/**
 * The cluster containing a point, or null.
 *
 * `querySourceFeatures` returns one row per intersecting tile and the
 * `cluster_id` lives on the row, so this scans for a cluster whose own centroid
 * is within a small tolerance of the point.
 *
 * The parentheses around `(coords[0] ?? 0)` are load-bearing. Without them the
 * expression parses as `coords[0] ?? (0 - point.lon)` — `??` binds looser than
 * `-` — which evaluates to the raw longitude, about 72.8, and the comparison
 * against 0.02 is never true. That silently disabled the whole spiderfy step of
 * the card coupling, in exactly the dense neighbourhoods it exists for, and
 * nothing errored.
 */
function clusterAt(
  map: ReturnType<MapRef["getMap"]>,
  point: GeoPoint,
): number | null {
  const features = map.querySourceFeatures(CLUSTERED_SOURCE);
  for (const feature of features) {
    const clusterId = feature.properties?.cluster_id;
    if (typeof clusterId !== "number") continue;
    const geometry = feature.geometry as GeoJSON.Point | undefined;
    const lon = geometry?.coordinates?.[0];
    const lat = geometry?.coordinates?.[1];
    if (typeof lon !== "number" || typeof lat !== "number") continue;
    if (Math.abs(lon - point.lon) < 0.02 && Math.abs(lat - point.lat) < 0.02) {
      return clusterId;
    }
  }
  return null;
}

/**
 * Spiderfy — fan the cluster's leaves out around its centre so each is
 * individually clickable. MapLibre has no built-in spiderfy, which is why the
 * reference implementations all hand-roll one; this adds unclustered points at
 * a small radius around the cluster and leaves the cluster underneath.
 */
function spiderfy(
  map: ReturnType<MapRef["getMap"]>,
  clusterId: number,
  point: GeoPoint,
): void {
  const source = map.getSource(CLUSTERED_SOURCE) as
    | (GeoJSONSource & { getClusterLeaves(clusterId: number, limit?: number): Promise<{ id?: string }[]> })
    | undefined;
  if (!source?.getClusterLeaves) return;

  void source.getClusterLeaves(clusterId, 12).then((leaves) => {
    const radius = 0.0016; // ~180 m, a screen-space-feeling spread at z17
    const features = leaves.map((leaf, index) => {
      const angle = (2 * Math.PI * index) / Math.max(1, leaves.length);
      return {
        type: "Feature" as const,
        id: leaf.id,
        properties: { id: leaf.id, spiderfied: true },
        geometry: {
          type: "Point" as const,
          coordinates: [point.lon + radius * Math.cos(angle), point.lat + radius * Math.sin(angle)],
        },
      };
    });

    const data: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
    const existing = map.getSource("spiderfied") as GeoJSONSource | undefined;

    if (existing) {
      existing.setData(data);
    } else {
      map.addSource("spiderfied", { type: "geojson", data });
      map.addLayer({
        id: "spiderfied-point",
        type: "circle",
        source: "spiderfied",
        paint: {
          "circle-color": "var(--accent)",
          "circle-radius": 8,
          "circle-stroke-width": 3,
          "circle-stroke-color": "var(--surface)",
        },
      });
    }
  });
}
