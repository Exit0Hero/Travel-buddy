"use client";

import { useEffect, useState } from "react";

/**
 * The narrative navigation.
 *
 * WHAT IT IS NOT. It is not a router. There is exactly one route in this app —
 * the home page carries the story and the working surface in sequence — so
 * every item here is an in-page anchor to a section that exists on this page.
 * Nothing here can 404, and there is not a single dead link.
 *
 * WHY THE ASK BUTTON IS A CUSTOM EVENT. The chat sidecar's open state lives
 * inside `DiscoverySurface`, which is a client component further down the same
 * tree. Lifting that state up here would mean threading it through the server
 * component that renders the story, and a nav that owns product state is the
 * wrong shape. Instead this dispatches one event and the surface listens for
 * it. One string constant, two small effects, no shared state and no prop
 * drilling. If the surface is ever replaced, this button degrades to a scroll
 * to the tool rather than throwing.
 *
 * ACTIVE SECTION. Tracked with an IntersectionObserver rather than a scroll
 * handler, because an observer does not run on every frame and does not need a
 * throttled listener competing with the scroll-driven reveals further down.
 */
const SECTIONS = [
  { id: "moment", label: "The moment" },
  { id: "understands", label: "How it thinks" },
  { id: "one-thing", label: "One thing" },
  { id: "change", label: "When plans change" },
  { id: "remember", label: "Memory" },
  { id: "discover", label: "Discover" },
] as const;

/** Kept in one place so the nav and the surface cannot drift apart. */
export const ASK_ATHITI_EVENT = "athiti:ask";

export function AthitiNav() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const nodes = SECTIONS.map((section) =>
      document.getElementById(section.id),
    ).filter((node): node is HTMLElement => node !== null);

    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry nearest the top of the viewport that is intersecting,
        // so the highlight changes when a section actually takes the reading
        // position rather than the moment it first peeks in from below.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A band across the upper third: a section becomes "current" once its
      // top edge crosses this line.
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const askAthiti = () => {
    const surface = document.getElementById("discover");
    surface?.scrollIntoView({ block: "start" });
    window.dispatchEvent(new CustomEvent(ASK_ATHITI_EVENT));
  };

  return (
    <nav className="athiti-nav" aria-label="Sections">
      <div className="athiti-nav__inner">
        <a
          href="#top"
          className="athiti-nav__link"
          style={{ letterSpacing: "var(--tracking-caps)" }}
        >
          Athiti
        </a>

        <div className="athiti-nav__links">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="athiti-nav__link"
              aria-current={active === section.id ? "true" : undefined}
            >
              {section.label}
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={askAthiti}
          className="min-h-9 rounded-pill px-4 py-2 font-mono text-meta-sm uppercase tracking-[var(--tracking-caps)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]"
          style={{
            backgroundColor: "var(--band-accent)",
            color: "var(--band)",
          }}
        >
          Ask Athiti
        </button>
      </div>
    </nav>
  );
}
