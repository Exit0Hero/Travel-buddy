import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ThemeScript } from "./_components/ThemeScript";

import "../styles/globals.css";
/*
  motion.css is imported HERE, not from inside globals.css, and that is not a
  stylistic preference. Adding a third `@import` to globals.css — after
  `tailwindcss` and `tokens.css` — makes the PostCSS/Tailwind import chain
  silently drop `tokens.css` from the ENTIRE build. Every route then loses the
  design system, `next build` still exits 0, and every gate in the repo still
  passes. It was found only by counting the emitted CSS bytes per route, not by
  running the gates.

  Importing it as a sibling of globals.css keeps the two-file chain exactly as
  it was, and puts the motion stylesheet on the same footing as every other
  stylesheet in the app.
*/
import "../styles/motion.css";

export const metadata: Metadata = {
  title: {
    default: "TravelBuddy — plans that actually fit",
    template: "%s — TravelBuddy",
  },
  description:
    "Local discovery for time-constrained travellers. A recommendation has to fit your hours, your budget and your body, or it is not shown.",
  // The map tiles are keyless public endpoints and the whole point is that
  // nothing here needs an account. Saying so is more honest than implying
  // there is a signup.
  applicationName: "TravelBuddy",
};

export const viewport: Viewport = {
  // Zoom is left enabled. `maximumScale: 1` is a common default and it breaks
  // the per-tier font scaling for anyone who needs to zoom, which DESIGN_SYSTEM
  // §5 requires to work.
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4EF" },
    { media: "(prefers-color-scheme: dark)", color: "#14130F" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          The theme has to be applied before first paint or a dark-mode user
          gets a full second of bone-white canvas. It has to be a blocking
          inline script for the same reason, which is why it lives in <head>
          and why tokens.css cannot be the only place this is expressed.
        */}
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        {/*
          The skip link is the first focusable thing on the page, so a keyboard
          user can reach the content without tabbing the whole chrome. The map
          is unreachable by keyboard by design, which makes this the only route
          past it.
        */}
        <a href="#main" className="skip-link">
          Skip to the plan
        </a>
        {children}
      </body>
    </html>
  );
}
