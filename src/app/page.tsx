import type { Metadata } from "next";

import { DiscoverySurface } from "./_components/DiscoverySurface";
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

export const metadata: Metadata = {
  title: "Plans that actually fit",
  description:
    "Three hours, four people, one a toddler, and someone who cannot manage stairs. Here is what fits, and here is what does not.",
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

  return (
    <DiscoverySurface
      initialPlan={FIXTURE_PLAN}
      context={FIXTURE_CONTEXT}
      experiences={FIXTURE_EXPERIENCES}
      fits={FIXTURE_FITS}
      scores={FIXTURE_SCORES}
      rejections={FIXTURE_REJECTIONS}
      weights={FIXTURE_WEIGHTS}
      source={engine.ready ? "engine" : "fixtures"}
    />
  );
}
