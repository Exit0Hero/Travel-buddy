/**
 * Barrel for the fit components — the signature set.
 *
 * Everything here renders a frozen-contract value and computes nothing. The
 * boundary with Abhijit's stream is exact: `fit/format.ts` turns integers into
 * strings and never does arithmetic, and the one place it divides
 * (`deriveAvailable`, recovering `availableMin` from `utilisation`) is a
 * division the contract already defines rather than a second opinion.
 */

export {
  minutesToClock,
  minutesToDuration,
  minutesToDurationShort,
  metresToDistance,
  minorToRupees,
  minorToRupeesExact,
  ratingToDisplay,
  shortfallToPhrase,
  categoryLabel,
  rejectionLabel,
} from "./format";

export { FitMeter } from "./FitMeter";
export type { FitMeterProps } from "./FitMeter";

export { TimeBudgetBar, PlanTimeBudgetBar } from "./TimeBudgetBar";
export type { TimeBudgetBarProps } from "./TimeBudgetBar";

export { TravelConnector } from "./TravelConnector";
export type { TravelConnectorProps } from "./TravelConnector";

export { StressRadar, PlanStressRadar } from "./StressRadar";
export type { StressRadarProps, StressDimension } from "./StressRadar";

export { WhyLedger, LearnedWeights } from "./WhyLedger";
export type { WhyLedgerProps, LearnedWeightsProps } from "./WhyLedger";

export { ScoreBreakdownList, WhyRejected } from "./ScoreBreakdownList";
export type { ScoreBreakdownListProps, WhyRejectedProps } from "./ScoreBreakdownList";

export { ResultCard } from "./ResultCard";
export type { ResultCardProps } from "./ResultCard";
