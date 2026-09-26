import type { Metadata } from "next";

import { DiscoverySurface } from "./_components/DiscoverySurface";
import { KageEngine } from "@/marketing/kage-engine";
import { landingChapters } from "@/marketing/landing";
import {
  FIXTURE_EXPERIENCES,
  FIXTURE_FITS,
  FIXTURE_PLAN,
  FIXTURE_REJECTIONS,
  FIXTURE_SCORES,
  FIXTURE_WEIGHTS,
  FIXTURE_CONTEXT,
} from "./_fixtures";
import { loadEngine } from "./_lib/engine";

import "@/marketing/kage-engine/kage-engine.css";

export const metadata: Metadata = {
  title: "Athiti — Don't just visit. Belong.",
  description:
    "Three hours, four people, one a toddler, and someone who cannot manage stairs. Here is what fits, and here is what does not.",
};

/*
  Dynamic on purpose. The page reads whether the engine is present, so a build
  that prerendered it would freeze "fixtures" into the HTML and keep saying so
  after the real engine lands.
*/
export const dynamic = "force-dynamic";

/*
  ONE ROUTE. `/` is the whole application: the cinematic half, then the tool.

  There used to be five routes — a marketing landing, /about, /how-it-works,
  /discover and a third-party template at /experience. They are now one page.
  The components were not deleted, only the routes that framed them: the map,
  the feasibility meters, the itinerary, the ledger, the chat sidecar, the
  context editor and the reality triggers are all still here, in the order you
  reach them.
*/
export default async function Page() {
  const engine = await loadEngine();
  const source = engine.ready ? "engine" : "fixtures";

  return (
    <>
      {/*
        Act one — the story. A night city, a scroll-synced camera, and four
        chapters that make the argument. Every figure is read out of the
        traveller's own context or the plan; nothing is typed in to sound good.
      */}
      <KageEngine
        config={{
          title: "Athiti",
          tagline: "Don't just visit. Belong.",
          seed: 20260926,
          cta: { href: "#tool", label: "Open the tool" },
          chapters: landingChapters,
        }}
      />

      {/*
        Act two — the instrument, unchanged. This is the entire functional
        application: context editor, feasibility meters, result cards, the
        itinerary, the live map, the why-this/why-not ledger, the chat sidecar
        and the reading-comfort controls.

        The id is the CTA's target, so the engine's own button is a plain anchor
        that works with WebGL absent and with JavaScript absent.
      */}
      <main id="tool" className="athiti-tool bg-canvas">
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
      </main>
    </>
  );
}
