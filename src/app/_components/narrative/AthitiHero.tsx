/**
 * The opening frame.
 *
 * This is the part of the reference implementation that mattered most and the
 * part that was hardest to keep honest. The reference opens on a full-bleed
 * WebGL scene with a chapter marker, a nav row, a giant sans wordmark, and a
 * scroll cue. What carried over: full-viewport entry, a small mono label, very
 * large editorial serif, one line of real numbers, two actions, and a depth
 * field that moves behind the type.
 *
 * What did NOT carry over: the scene itself. Athiti's field is an SVG contour
 * map of the traveller's actual position and the actual places, which is a
 * truer subject than an abstract shader would have been. See
 * `src/styles/athiti.css` for why there is no WebGL here.
 */
import type { Experience } from "@/contracts";
import { minutesToDuration, minorToRupees } from "@/components/fit";

import { AtmosphereField } from "./AtmosphereField";

export interface AthitiHeroProps {
  /** Where the traveller is, verbatim from the context. */
  originLabel: string;
  availableMin: number;
  budgetMinor: number | null;
  partySize: number;
  /** The catalogue, for the field's node placement. */
  experiences: ReadonlyArray<Experience>;
  /** The chosen stops, in plan order, for the route line. */
  routeIds: ReadonlyArray<string>;
  /** The place the plan leads with. */
  heroId: string;
}

export function AthitiHero({
  originLabel,
  availableMin,
  budgetMinor,
  partySize,
  experiences,
  routeIds,
  heroId,
}: AthitiHeroProps) {
  return (
    <section className="athiti-band athiti-hero" id="top" aria-labelledby="hero-title">
      <div className="athiti-band__light" />
      <AtmosphereField
        experiences={experiences}
        routeIds={routeIds}
        heroId={heroId}
      />
      <div className="athiti-band__grain" />
      <div className="athiti-hero__scrim" />

      <div className="athiti-hero__inner">
        <p className="athiti-eyebrow">Athiti</p>

        <h1 id="hero-title" className="athiti-display mt-4">
          Don&rsquo;t just visit.
          <br />
          <em>Belong.</em>
        </h1>

        <p className="athiti-lede mt-6">
          A local companion that understands what would make this moment better.
        </p>

        {/*
          The one place the hero states a fact. It is the traveller's own
          context, formatted with the product's own formatters, so it cannot
          drift from what the tool below is actually working with.
        */}
        <p className="athiti-figure mt-6 text-ink-muted" style={{ color: "var(--band-ink-muted)" }}>
          {minutesToDuration(availableMin)} · {partySize} of you ·{" "}
          {budgetMinor === null ? "no budget set" : minorToRupees(budgetMinor)} ·{" "}
          {originLabel}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#discover"
            className="min-h-11 rounded-pill px-6 py-3 font-mono text-meta-sm uppercase tracking-[var(--tracking-caps)] transition-opacity duration-[var(--dur-fast)] ease-[var(--ease-out-soft)] hover:opacity-90"
            style={{ backgroundColor: "var(--band-accent)", color: "var(--band)" }}
          >
            See what fits
          </a>
          <a
            href="#moment"
            className="min-h-11 rounded-pill border px-6 py-3 font-mono text-meta-sm uppercase tracking-[var(--tracking-caps)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]"
            style={{
              borderColor: "var(--band-rule)",
              color: "var(--band-ink)",
            }}
          >
            How this works
          </a>
        </div>
      </div>
    </section>
  );
}
