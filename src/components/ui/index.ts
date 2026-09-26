/**
 * Barrel for the design-system primitives.
 *
 * The inventory is fixed by DESIGN_SYSTEM §3 and the build order there is the
 * order these were written in. Everything reads the frozen contracts; nothing
 * in this folder computes a fit, a score or a rejection.
 */

export { cn } from "../cn";

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Card, CardHeader, CardDivider } from "./Card";
export type { CardProps, CardTone, CardHeaderProps } from "./Card";

export { Badge, FactPill } from "./Badge";
export type { BadgeProps, BadgeTone } from "./Badge";

export {
  Skeleton,
  SkeletonRoot,
  SkeletonText,
  ResultCardSkeleton,
  PlanStopSkeleton,
  FitMeterSkeleton,
  TravelConnectorSkeleton,
  TimeBudgetBarSkeleton,
  StressRadarSkeleton,
  LedgerRowSkeleton,
  ResultListSkeleton,
  SKELETON_PATTERNS,
} from "./Skeleton";
export type { SkeletonPattern } from "./Skeleton";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps, EmptyKind } from "./EmptyState";

export { Disclosure, ControlledDisclosure } from "./Disclosure";
export type { DisclosureProps } from "./Disclosure";

export { Toggle, Slider, SegmentedControl } from "./Controls";
export type {
  ToggleProps,
  SliderProps,
  SegmentedControlProps,
  SegmentedControlOption,
} from "./Controls";

export { Popover, Sheet, Dialog, Tooltip } from "./Overlays";
export type { PopoverProps, SheetProps, DialogProps, TooltipProps } from "./Overlays";
