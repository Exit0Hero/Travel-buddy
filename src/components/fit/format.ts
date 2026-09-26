/**
 * Presentation formatters.
 *
 * Karan's rule, and the reason these live here rather than in `src/lib/`:
 * these FORMAT values the engine computed. They never compute a fit, a score,
 * a duration or a shortfall. `src/lib/**` belongs to Abhijit and holds the
 * arithmetic; when `src/lib/money.ts` and `src/lib/time.ts` land, the bodies
 * below become thin delegations and no call site changes.
 *
 * Every one of these has to produce a finished, human-readable fragment. The
 * difference between "2h 40m" and "160" is the whole reason the rejection
 * panel is a product feature instead of a debug log.
 */

/** Minutes since local midnight → "14:10". The engine's canonical time form. */
export function minutesToClock(minutes: number): string {
  const clamped = Math.max(0, Math.min(1440, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Duration → "2h 05m", "45m", "1h 30m".
 *
 * Minutes are always two-digit-padded when an hour is present. "2h 5m" reads
 * as a typo next to a tabular-numeral table where every other column is
 * aligned, which is the whole reason the data face exists.
 */
export function minutesToDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${String(mins).padStart(2, "0")}m`;
}

/**
 * Compact form for tight spaces — a chip, a segment label, a connector.
 * "2h 05m" → "2h5". Never used where the exact figure matters.
 */
export function minutesToDurationShort(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins === 0 ? `${hours}h` : `${hours}h${mins}`;
}

/** Metres → "850 m" under a kilometre, "1.2 km" above. */
export function metresToDistance(metres: number): string {
  const total = Math.max(0, Math.round(metres));
  if (total < 1000) return `${total} m`;
  return `${(total / 1000).toFixed(1)} km`;
}

/**
 * Minor units → "₹300", "₹1,500", "Free".
 *
 * Indian digit grouping is the 2-2-3 rule, not the western 3-3-3: ₹12,50,000,
 * never ₹1,250,000. The contract stores integer paise, so this divides by 100
 * once and never touches a float in the arithmetic path.
 */
export function minorToRupees(minor: number, currency = "INR"): string {
  if (currency !== "INR") {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
  const rupees = Math.round(minor / 100);
  if (rupees === 0) return "Free";
  return `₹${groupIndian(rupees)}`;
}

/** Always shows a price, including zero. For a budget line, not a price tag. */
export function minorToRupeesExact(minor: number, currency = "INR"): string {
  if (currency !== "INR") return `${(minor / 100).toFixed(2)} ${currency}`;
  return `₹${groupIndian(Math.round(minor / 100))}`;
}

/** 2-2-3 from the right: 12,50,000. */
function groupIndian(value: number): string {
  const digits = String(Math.abs(value));
  if (digits.length <= 3) return digits;

  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${grouped},${last3}`;
}

/**
 * A rating with its sample size: "4.6 (312)".
 *
 * The count is never hidden. The contract smooths the rating toward a regional
 * prior, and showing the raw count is how the shrinkage stays visible — a 5.0
 * from three reviews and a 4.8 from three hundred are not the same claim, and
 * hiding the difference is how a ranking starts lying.
 */
export function ratingToDisplay(value: number, count: number): string {
  return `${value.toFixed(1)} (${count.toLocaleString("en-IN")})`;
}

/**
 * A signed shortfall for a rejection: "short by 40 min", "over by ₹300".
 *
 * Both parameters accept null because the contract allows it — `Rejection.shortfall`
 * and `Rejection.unit` are both nullable, and a caller should not have to
 * re-derive the guard this already performs.
 */
export function shortfallToPhrase(
  shortfall: number | null,
  unit: "minutes" | "minor_units" | "people" | "metres" | null,
  currency = "INR",
): string | null {
  if (shortfall === null || unit === null) return null;
  const magnitude = Math.abs(Math.round(shortfall));
  switch (unit) {
    case "minutes":
      return `short by ${minutesToDuration(magnitude)}`;
    case "minor_units":
      return `over by ${minorToRupeesExact(magnitude, currency)}`;
    case "people":
      return `short ${magnitude} ${magnitude === 1 ? "place" : "places"}`;
    case "metres":
      return `short by ${metresToDistance(magnitude)}`;
    default:
      return null;
  }
}

/** 0..1 → "68". For the stress score, which the contract types as 0..100. */
export function percent(value: number): string {
  return String(Math.round(value));
}

/** Traversal category → "Craft workshop". Sentence case, never Title Case. */
const CATEGORY_LABELS: Record<string, string> = {
  street_food: "Street food",
  restaurant: "Restaurant",
  cafe: "Cafe",
  market: "Market",
  craft_workshop: "Craft workshop",
  art_studio: "Art studio",
  music_live: "Live music",
  dance_performance: "Dance",
  theatre: "Theatre",
  temple: "Temple",
  church: "Church",
  mosque: "Mosque",
  heritage_site: "Heritage site",
  museum: "Museum",
  gallery: "Gallery",
  nature: "Nature",
  beach: "Beach",
  adventure: "Adventure",
  wellness: "Wellness",
  nightlife: "Nightlife",
  shopping: "Shopping",
  community_hosted: "Community hosted",
  festival: "Festival",
  event: "Event",
  hidden_place: "Hidden place",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

/**
 * A human label for a `RejectionCode`.
 *
 * This is a LABEL, not the sentence. The finished sentence with a real number
 * in it is `Rejection.message`, and the contract is explicit that it must
 * never be "constraint violated". Content for the 25 messages belongs to
 * Vishwesh in `content/` (TASKS.md); until that lands this keeps the code
 * readable rather than inventing copy that would then need replacing.
 */
const REJECTION_LABELS: Record<string, string> = {
  too_far: "Too far away",
  travel_time_exceeds_budget: "Travel time",
  duration_exceeds_budget: "Time needed",
  closed_now: "Closed now",
  closed_during_window: "Closed then",
  hours_unverified: "Hours unverified",
  over_budget: "Over budget",
  over_budget_per_person: "Over per-person limit",
  capacity_exceeded: "Group too large",
  not_step_free: "Not step-free",
  not_stroller_ok: "Not stroller-friendly",
  no_low_stairs: "Stairs involved",
  no_hearing_loop: "No hearing loop",
  no_restroom: "No restroom on site",
  inaccessible: "Not accessible",
  diet_mismatch: "Diet mismatch",
  sold_out: "Sold out",
  requires_booking_not_available: "Booking needed",
  lead_time_too_short: "Not enough notice",
  weather_unsafe: "Unsafe in this weather",
  duplicate: "Duplicate",
  already_planned: "Already in the plan",
  excluded_by_traveller: "You excluded this",
  mustsee_conflict: "Conflicts with a must-see",
  seasonal_mismatch: "Wrong season",
};

export function rejectionLabel(code: string): string {
  return REJECTION_LABELS[code] ?? code.replace(/_/g, " ");
}
