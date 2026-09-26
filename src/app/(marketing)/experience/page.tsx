"use client";

import dynamic from "next/dynamic";

import "@designcodeio/threeui/style.css";

/**
 * /experience — an isolated visual. Not part of the discovery app.
 *
 * WHAT THIS IS. The ThreeUI Kage landing page, mounted whole, on its own route
 * group so it shares nothing with the discovery surface: no layout, no token
 * layer, no design-system primitive, no contract. It is a reference visual and
 * it is deliberately quarantined — `npm run theme:lint`, `copy:lint` and
 * `contrast:lint` all skip this path, and the reason is in each linter.
 *
 * WHY THE SUBPATH INSTEAD OF THE PACKAGE ROOT.
 *
 *     import { KageLandingPage } from "@designcodeio/threeui";            // fails
 *     import { KageLandingPage } from "@designcodeio/threeui/components/KageLandingPage";
 *
 * Both are declared in the package's own `exports` map, so both are supported.
 * The root barrel re-exports all 103 components, and some of them — `Gallery.js`
 * among them — reach their textures through Vite's asset-generator form:
 *
 *     new URL("data:image/webp;base64,…", import.meta.url)
 *
 * Webpack's asset-module plugin rejects that shape outright:
 *
 *     Invalid generator object … generator has an unknown property 'filename'
 *
 * It fails the *whole build*, and tree shaking never gets the chance to discard
 * the offending module, because the error happens while it is being parsed. The
 * subpath entry resolves to a two-line re-export of
 * `shaders/landing-pages/LandingPages.js` and nothing else, so no Vite-specific
 * module is ever reached. Nothing about Kage itself changes.
 *
 * WHY `"use client"`. Two reasons, both load-bearing.
 *
 *  1. `next/dynamic` with `ssr: false` is not permitted in a Server Component.
 *     The page has to be a client boundary for the option to be accepted.
 *  2. The component ships no `"use client"` directive anywhere in its published
 *     `lib-dist`, yet it calls `useState`, `useRef` and `useEffect`. Importing
 *     it into a server component fails on the hooks.
 *
 * The result is that neither the component nor its WebGL runtime is in the main
 * app bundle: this module is reachable only from `/experience`.
 *
 * WHERE THE DOCUMENT COMES FROM. `KageLandingPage` hard-codes its own
 * `sourceUrl` to `/landing-pages/kage.html` on the host origin, and the package
 * ships that document plus its 16 assets under `lib-dist/assets/landing-pages/`.
 * They are copied verbatim into `public/landing-pages/` so that path resolves.
 * They are byte-identical to the package's own copies and are not ours to edit.
 */

/*
  `next/dynamic` needs a module that default-exports the component, so the
  named export is mapped across here rather than passed as a bare function.
*/
const KageLandingPage = dynamic(
  () =>
    import("@designcodeio/threeui/components/KageLandingPage").then(
      (mod) => mod.KageLandingPage,
    ),
  {
    ssr: false,
    /*
      The frame paints an opaque base colour before the document loads, so
      there is no flash to paper over and no skeleton worth shipping. Loading
      is set to eager because this route exists to be looked at; deferring the
      one thing the page is for would just add latency.
    */
    loading: () => null,
  },
);

export default function ExperiencePage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <KageLandingPage
        headingFont="onest"
        bodyFont="onest"
        headingWeight="400"
        bodyWeight="300"
        primaryColor="#e0231c"
        headingSize={46}
        bodySize={17}
        headingLetterSpacing={-0.012}
      />
    </div>
  );
}
