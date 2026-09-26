import type { Metadata } from "next";

import { DiscoverySurface } from "../_components/DiscoverySurface";
import { AthitiNav } from "../_components/narrative/AthitiNav";
import { AthitiHero } from "../_components/narrative/AthitiHero";
import { AthitiNarrative } from "../_components/narrative/AthitiNarrative";
import {
  FIXTURE_EXPERIENCES,
  FIXTURE_FITS,
  FIXTURE_PLAN,
  FIXTURE_REJECTIONS,
  FIXTURE_SCORES,
  FIXTURE_WEIGHTS,
  FIXTURE_CONTEXT,
} from "../_fixtures";
import { loadEngine } from "../_lib/engine";

import "../../styles/athiti.css";

export const metadata: Metadata = {
  title: "Don't just visit. Belong.",
  description:
    "Athiti is a local companion for people with three hours and four different needs. It shows you what fits, and what does not, and why.",
};

/*
  Dynamic on purpose. The page reads whether the engine is present, so a build
  that prerendered it would freeze "fixtures" into the HTML and keep saying so
  after the engine lands. The cost is a server render per request, which for one
  page with no data access is not worth optimising away.
*/
export const dynamic = "force-dynamic";

export default async function Page() {
  /*
    The engine, when it exists, decides this page. Until then the fixtures do,
    and `source` says which — so a demo never claims to be live while serving
    static data. The full fixture path (`discover`) is not called here because
    the engine seam is a server concern; this is the same shape it will take
    once the catalogue is real.
  */
  const engine = await loadEngine();
  const source = engine.ready ? "engine" : "fixtures";

  /*
    The narrative reads from the same objects the tool reads from. One source,
    two renderings — so the story and the instrument can never disagree about
    what the plan is.
  */
  const plan = FIXTURE_PLAN;
  const routeIds = plan.stops.map((stop) => stop.experienceId);
  const heroId = routeIds[0] ?? FIXTURE_EXPERIENCES[0]?.id ?? "";

  return (
    <>
      {/*
        Act one, the story. A night band, a point of view, and every figure read
        out of the traveller's own context.
      */}
      <div className="athiti-band">
        <AthitiNav />
        <AthitiHero
          originLabel={FIXTURE_CONTEXT.origin.label}
          availableMin={FIXTURE_CONTEXT.availableMin}
          budgetMinor={FIXTURE_CONTEXT.budget?.minor ?? null}
          partySize={FIXTURE_CONTEXT.partySize}
          experiences={FIXTURE_EXPERIENCES}
          routeIds={routeIds}
          heroId={heroId}
        />
        <AthitiNarrative
          context={FIXTURE_CONTEXT}
          experiences={FIXTURE_EXPERIENCES}
          plan={plan}
          rejections={FIXTURE_REJECTIONS}
          weights={FIXTURE_WEIGHTS}
          source={source}
        />
      </div>

      {/*
        Act two, the instrument. Unchanged and fully functional: the context
        editor, the feasibility meters, the itinerary, the map, the ledger, the
        chat sidecar and the reading-comfort controls. The seam below is a
        deliberate edge between a dark narrative and a daylight tool, not a
        cross-fade.
      */}
      <div className="athiti-seam" id="discover">
        <DiscoverySurface
          initialPlan={FIXTURE_PLAN}
          context={FIXTURE_CONTEXT}
          experiences={FIXTURE_EXPERIENCES}
          fits={FIXTURE_FITS}
          scores={FIXTURE_SCORES}
          rejections={FIXTURE_REJECTIONS}
          weights={FIXTURE_WEIGHTS}
          source={source}
        />
      </div>
    </>
  );
}
