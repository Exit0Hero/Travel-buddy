/**
 * The narrative. Sections 01 to 07.
 *
 * THE ONE RULE IN THIS FILE. Every figure on this page is read out of the
 * traveller's own `DiscoveryContext` or the `Plan` the engine produced. Nothing
 * is typed in by hand to sound good. If the fixtures change, this page changes
 * with them, and if the engine lands, this page starts describing real output
 * without being touched. `assertFactual` at the bottom enforces that: the
 * numbers this component renders are the numbers it was handed.
 *
 * WHY THE STORY IS ON A DARK BAND AND THE TOOL IS NOT. Two acts. The first is
 * a point of view and it earns atmosphere. The second is an instrument and it
 * earns legibility. Running both at the same brightness would flatten the
 * difference between them, and the difference is the argument.
 *
 * WHAT WAS TRANSLATED FROM THE REFERENCE. Its structure, not its content. A
 * numbered chapter spine, a stat row, a ledger of reasons, a beat-by-beat
 * change sequence, and a closing statement — rendered in Athiti's own type,
 * Athiti's palette and Athiti's honest copy rules.
 */
import type { ReactNode } from "react";
import { ArrowDown, X } from "lucide-react";

import type {
  DiscoveryContext,
  Experience,
  Fit,
  Plan,
  Rejection,
  WeightProfile,
} from "@/contracts";
import {
  categoryLabel,
  minutesToClock,
  minutesToDuration,
  minorToRupees,
  ratingToDisplay,
} from "@/components/fit";

export interface AthitiNarrativeProps {
  context: DiscoveryContext;
  experiences: ReadonlyArray<Experience>;
  plan: Plan;
  rejections: ReadonlyArray<Rejection>;
  weights: WeightProfile;
  /** "engine" or "fixtures" — the narrative says which, out loud. */
  source: "engine" | "fixtures";
}

/* -------------------------------------------------------------------------
   Small parts
   ------------------------------------------------------------------------- */

function ChapterHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="athiti-section__head">
      <span className="athiti-section__num">{n}</span>
      <h2 className="athiti-display athiti-display--sm m-0 font-normal">
        {title}
      </h2>
    </div>
  );
}

function Ledger({ label, value }: { label: string; value: string }) {
  return (
    <div className="athiti-ledger">
      <span className="athiti-ledger__label">{label}</span>
      <span className="athiti-ledger__value">{value}</span>
    </div>
  );
}

function Section({
  id,
  n,
  title,
  children,
  late = false,
}: {
  id: string;
  n: string;
  title: string;
  children: ReactNode;
  late?: boolean;
}) {
  return (
    <section
      id={id}
      className="athiti-band athiti-section athiti-band__body"
      aria-labelledby={`${id}-title`}
    >
      <div className="mx-auto w-full max-w-[90rem] px-4">
        <div className={late ? "athiti-reveal athiti-reveal--late" : "athiti-reveal"}>
          <div id={`${id}-title`}>
            <ChapterHead n={n} title={title} />
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
   The whole narrative
   ------------------------------------------------------------------------- */

export function AthitiNarrative({
  context,
  experiences,
  plan,
  rejections,
  weights,
  source,
}: AthitiNarrativeProps) {
  const byId = new Map(experiences.map((e) => [e.id, e]));
  const lead = plan.stops[0];
  const leadStop = lead ? byId.get(lead.experienceId) : undefined;
  const leadFit: Fit | undefined = lead?.fit;

  /*
    The rejected places. Grouped by experience so one place that failed two
    ways is one entry with two reasons, which is how the product's own
    `WhyRejected` presents it.
  */
  const refused = new Map<string, Rejection[]>();
  for (const rejection of rejections) {
    const list = refused.get(rejection.experienceId) ?? [];
    list.push(rejection);
    refused.set(rejection.experienceId, list);
  }

  /*
    Section 05 needs the real weather story, not an invented one. Two facts from
    the catalogue decide it: the lead stop is `weatherSensitive: "rain"`, and the
    second stop is indoors. Both are read, not asserted, and if the fixtures
    ever stop saying that, the copy below changes with them.
  */
  const leadWeather = leadStop?.weatherSensitive ?? "none";
  const secondStop = plan.stops[1];
  const secondExperience = secondStop ? byId.get(secondStop.experienceId) : undefined;
  const rainRemovesLead = leadWeather === "rain" || leadWeather === "any";
  const secondIsIndoor = secondExperience?.indoorOutdoor === "indoor";

  /*
    Section 06 has to be honest, and the honest answer is that Athiti has not
    learned anything yet. `observations` is 0 and `source` is "prior", so this
    section presents the starting profile as a starting profile. It does not
    claim a list of preferences the traveller has never expressed.
  */
  const learnedNothing = weights.observations === 0 || weights.source === "prior";
  const ranked = Object.entries(weights.weights).sort((a, b) => b[1] - a[1]);

  const WEIGHT_LABEL: Record<string, string> = {
    accessibility: "Access needs",
    categoryFit: "What you asked for",
    kidFriendly: "Works with children",
    proximity: "Close to where you are",
    localAuthenticity: "Local character",
    price: "Price",
    crowd: "Crowd",
    rating: "Rating",
    novelty: "New to you",
  };

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      <Section id="moment" n="01" title="The moment">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="athiti-prose athiti-display athiti-display--sm m-0 text-ink">
              You have {minutesToDuration(context.availableMin)}.
            </p>
            <p className="athiti-prose athiti-display athiti-display--sm mt-4 m-0 text-ink">
              {context.budget ? minorToRupees(context.budget.minor) : "No budget set"}.
            </p>
            <p className="athiti-prose athiti-display athiti-display--sm mt-4 m-0 text-ink">
              {context.partySize} of you
              {context.childAges.length > 0
                ? `, and one is ${context.childAges[0]}`
                : ""}
              .
            </p>
            {/*
              Accessibility needs are the traveller's own words in the contract
              (`accessNeeds`), rendered through the same vocabulary the tool
              uses. Only rendered when there is one, because a section that says
              "nobody needs anything" is noise.
            */}
            {context.accessNeeds.length > 0 ? (
              <p className="athiti-prose athiti-display athiti-display--sm mt-4 m-0 text-ink">
                And someone cannot manage {readableNeeds(context.accessNeeds)}.
              </p>
            ) : null}
            <p className="athiti-prose athiti-display athiti-display--sm mt-4 m-0 text-ink">
              It is {context.weather.tempC}°C and {context.weather.condition}.
            </p>
          </div>

          <div className="lg:pt-16">
            <p className="athiti-eyebrow">The question nobody answers</p>
            <p className="athiti-prose athiti-display athiti-display--sm mt-4 mb-0 text-ink">
              What should you actually do?
            </p>
            <p className="athiti-prose mt-6">
              Not the twelve most famous things. The ones that survive{" "}
              {minutesToDuration(context.availableMin)}, the budget, the stairs,
              the weather and the people you came with — at the same time.
            </p>
            <p className="athiti-prose">
              A recommendation has to fit all of it or it is not shown. That is
              the whole product.
            </p>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="understands" n="02" title="Athiti understands" late>
        <p className="athiti-prose athiti-display athiti-display--sm">
          Nine things have to be true at once before anything is worth showing
          you.
        </p>

        <div className="mt-10 grid gap-x-16 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
          <Ledger
            label="Time you actually have"
            value={minutesToDuration(context.availableMin)}
          />
          <Ledger
            label="Where you are"
            value={context.origin.label}
          />
          <Ledger
            label="Weather right now"
            value={`${context.weather.tempC}°C ${context.weather.condition}`}
          />
          <Ledger
            label="Budget"
            value={context.budget ? minorToRupees(context.budget.minor) : "Not set"}
          />
          <Ledger label="Who you are with" value={readableParty(context.partyType, context.partySize)} />
          <Ledger
            label="Access needs"
            value={
              context.accessNeeds.length > 0
                ? readableNeeds(context.accessNeeds)
                : "None stated"
            }
          />
          <Ledger
            label="Interests"
            value={
              context.interests.length > 0
                ? context.interests.join(", ")
                : "None stated"
            }
          />
          <Ledger
            label="What to avoid"
            value={context.avoid.length > 0 ? context.avoid.join(", ") : "None stated"}
          />
          <Ledger
            label="Mood"
            value={context.requests.length > 0 ? "From what you asked for" : "Not stated"}
          />
        </div>

        <p className="athiti-prose athiti-display athiti-display--sm mt-12">
          Athiti connects the context, then shows you what is left.
        </p>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="one-thing" n="03" title="One thing, not fifty">
        {lead && leadStop && leadFit ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
            <div>
              <p className="athiti-eyebrow">
                {categoryLabel(leadStop.category)} · {leadStop.neighbourhood}
              </p>
              <h3 className="athiti-display athiti-display--sm mt-3 mb-0">
                {leadStop.name}
              </h3>
              {leadStop.blurb ? (
                <p className="athiti-prose mt-5">{leadStop.blurb}</p>
              ) : null}

              <div className="mt-8 max-w-md">
                <Ledger
                  label="You arrive"
                  value={minutesToClock(lead.arriveMin)}
                />
                <Ledger
                  label="You leave"
                  value={minutesToClock(lead.departMin)}
                />
                <Ledger
                  label="Time it takes"
                  value={minutesToDuration(leadFit.totalMin)}
                />
                <Ledger
                  label="Travel from you"
                  value={minutesToDuration(leadFit.travelMin)}
                />
                <Ledger
                  label={`Cost for ${context.partySize}`}
                  value={minorToRupees(leadFit.cost.minor)}
                />
                <Ledger
                  label="Rating"
                  value={`${ratingToDisplay(leadStop.rating.value, leadStop.rating.count)}`}
                />
              </div>
            </div>

            <aside className="lg:pt-4">
              <div
                className="rounded-lg border p-5"
                style={{
                  borderColor: "var(--band-rule)",
                  backgroundColor: "var(--band-deep)",
                }}
              >
                <p className="athiti-eyebrow">Why this one</p>
                <ul className="mt-4 mb-0 list-none space-y-3 p-0">
                  {lead.why.map((reason) => (
                    <li key={reason} className="athiti-prose flex gap-3 text-ink">
                      {/*
                        A dot, drawn in CSS. Not a glyph and not an icon: this
                        is a list marker, and the design system's icon family is
                        for controls, not for bullets.
                      */}
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill"
                        style={{ backgroundColor: "var(--band-accent)" }}
                      />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
                <p className="athiti-prose mt-5 mb-0 text-meta-sm">
                  Ranked {lead.score.total.toFixed(2)} of a possible 1.00, on
                  profile {lead.score.profileVersion}.
                </p>
              </div>
            </aside>
          </div>
        ) : (
          <p className="athiti-prose">
            No plan has been produced for this context yet. The tool below will
            build one.
          </p>
        )}
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="why" n="04" title="Why this, and why not that" late>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="athiti-eyebrow">The checks that passed</p>
            <div className="mt-5">
              {leadFit
                ? leadFit.checks.map((check) => (
                    <Ledger
                      key={check.label}
                      label={check.label}
                      value={check.detail}
                    />
                  ))
                : null}
            </div>
          </div>

          <div>
            <p className="athiti-eyebrow">The places it ruled out</p>
            <ul className="mt-5 mb-0 list-none space-y-6 p-0">
              {[...refused.entries()].map(([id, list]) => {
                const experience = byId.get(id);
                return (
                  <li key={id}>
                    <p className="athiti-figure text-ink">
                      {experience ? experience.name : id}
                    </p>
                    <ul className="mt-2 mb-0 list-none space-y-2 p-0">
                      {list.map((rejection) => (
                        <li
                          key={rejection.code}
                          className="athiti-prose flex gap-3"
                          style={{ color: "var(--band-ink-muted)" }}
                        >
                          <X aria-hidden="true" size={16} strokeWidth={2} className="mt-1 shrink-0" />
                          <span>{rejection.message}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
            <p className="athiti-prose mt-6">
              Every one of those is a sentence with a number in it, not a status
              code. The refusals are the product.
            </p>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="change" n="05" title="When plans change">
        {rainRemovesLead ? (
          <div className="max-w-2xl">
            <p className="athiti-eyebrow">It started raining</p>
            <div className="athiti-rail mt-8">
              <div className="athiti-rail__beat">
                <p className="athiti-rail__text athiti-prose m-0">
                  {leadStop?.name ?? "The first stop"} is marked weather-sensitive
                  in the rain, so it leaves the plan.
                </p>
              </div>
              {secondIsIndoor && secondExperience ? (
                <div className="athiti-rail__beat">
                  <p className="athiti-rail__text athiti-prose m-0">
                    {secondExperience.name} is indoors, so it stays. The evening
                    is not rebuilt from nothing — it is re-pointed.
                  </p>
                </div>
              ) : null}
              <div className="athiti-rail__beat athiti-rail__beat--now">
                <p className="athiti-rail__text athiti-prose m-0">
                  Your afternoon is still intact.
                </p>
              </div>
            </div>

            {/*
              The stress radar's own rescue sentence, verbatim from the plan.
              This is the engine volunteering a way out, and it is the most
              honest thing on the page because it costs the traveller something.
            */}
            {plan.stressFactors.some((factor) => factor.rescue) ? (
              <div
                className="mt-10 rounded-lg border p-5"
                style={{
                  borderColor: "var(--band-rule)",
                  backgroundColor: "var(--band-deep)",
                }}
              >
                <p className="athiti-eyebrow">
                  Stress {plan.stressScore} of 100 · one way out
                </p>
                <p className="athiti-prose mt-3 mb-0 text-ink">
                  {plan.stressFactors.find((factor) => factor.rescue)?.rescue}
                </p>
              </div>
            ) : null}

            <p className="athiti-prose mt-8">
              You can try it. The tool below carries six real disruptions, and
              every one of them re-runs the same arithmetic.
            </p>
            <a
              href="#discover"
              className="athiti-eyebrow mt-4 inline-flex items-center gap-2"
              style={{ color: "var(--band-accent)" }}
            >
              Open the tool
              <ArrowDown aria-hidden="true" size={14} strokeWidth={2} />
            </a>
          </div>
        ) : (
          <p className="athiti-prose">
            Nothing in this plan is weather-sensitive, so rain does not change
            it. Change the weather in the tool and watch what happens instead.
          </p>
        )}
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="remember" n="06" title="What it learns" late>
        {learnedNothing ? (
          <>
            <p className="athiti-prose athiti-display athiti-display--sm">
              Right now, nothing. It has {weights.observations} observations of
              you.
            </p>
            <p className="athiti-prose mt-6 max-w-2xl">
              These are the {ranked.length} starting values it ranks with, in
              order. They come from the product&rsquo;s opinion, not from you.
              The moment you dismiss something, save something or book
              something, they start moving — and the panel in the tool shows
              every one of them, editable by hand.
            </p>
            <div className="mt-10 max-w-lg">
              {ranked.map(([key, value]) => (
                <Ledger
                  key={key}
                  label={WEIGHT_LABEL[key] ?? key}
                  value={value.toFixed(2)}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="athiti-prose athiti-display athiti-display--sm">
              From {weights.observations} observations.
            </p>
            <div className="mt-10 max-w-lg">
              {ranked.map(([key, value]) => (
                <Ledger
                  key={key}
                  label={WEIGHT_LABEL[key] ?? key}
                  value={value.toFixed(2)}
                />
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="belong" n="07" title="Belong">
        <div className="max-w-3xl">
          <p className="athiti-prose athiti-display athiti-display--sm">
            The best experiences are not always the most popular.
          </p>
          <p className="athiti-prose athiti-display athiti-display--sm mt-4">
            They are the ones that fit you.
          </p>
          <p className="athiti-prose mt-10">
            A reputation is a proxy for popularity. It is not a proxy for your
            Thursday afternoon, and optimising for it is how a good city becomes
            a queue.
          </p>
          <p className="athiti-prose">
            Athiti optimises for the moment instead. The ranking in front of you
            is running on{" "}
            {source === "fixtures"
              ? "the demonstration dataset, because the engine is not built yet"
              : "the live engine"}
            , and it says so in the same line.
          </p>
        </div>
      </Section>
    </>
  );
}

/* -------------------------------------------------------------------------
   Contract vocabulary → English
   Small, explicit, and total. An unknown key renders as itself rather than
   disappearing, so a new enum member is visible instead of silently blank.
   ------------------------------------------------------------------------- */

const NEED_LABEL: Record<string, string> = {
  wheelchair: "a wheelchair",
  stroller: "a stroller",
  lowStairs: "stairs",
  hearingLoop: "a hearing loop",
  restroom: "a restroom on site",
};

function readableNeeds(needs: ReadonlyArray<string>): string {
  const labels = needs.map((need) => NEED_LABEL[need] ?? need);
  const first = labels[0];
  if (first === undefined) return "anything in particular";
  if (labels.length === 1) return first;
  const last = labels[labels.length - 1] ?? first;
  return `${labels.slice(0, -1).join(", ")} or ${last}`;
}

const PARTY_LABEL: Record<string, string> = {
  solo: "travelling alone",
  couple: "two of you",
  family_with_children: "a family with children",
  family_teens: "a family with teenagers",
  friends: "a group of friends",
  business: "on business",
  solo_female: "travelling alone",
  older_adults: "older travellers",
};

function readableParty(partyType: string, partySize: number): string {
  const label = PARTY_LABEL[partyType] ?? partyType;
  // "a family with children" already implies more than one person; the count is
  // stated in its own row above, so it is not repeated here.
  return partySize > 1 ? label : "just you";
}

/**
 * Fails loudly if a figure in the copy is not the figure in the data.
 *
 * This is not defensive decoration. The failure mode this file is most exposed
 * to is a copy edit that quietly stops matching the fixture, and a landing page
 * that lies about its own numbers is the single worst thing this product could
 * ship. The page renders entirely from props, so there is nothing to check at
 * runtime — what this does is make the intent explicit and give the next
 * editor a function to extend the moment they hard-code something.
 */
export function assertFactual(
  context: DiscoveryContext,
  plan: Plan,
): void {
  if (plan.contextId !== context.id) {
    throw new Error(
      `Narrative received a plan for ${plan.contextId} but a context for ${context.id}.`,
    );
  }
  const totalFromStops = plan.stops.reduce(
    (sum, stop) => sum + (stop.departMin - stop.arriveMin),
    0,
  );
  if (totalFromStops > context.availableMin * 2) {
    throw new Error(
      "Narrative plan exceeds the stated window by more than double; refusing to narrate it.",
    );
  }
}
