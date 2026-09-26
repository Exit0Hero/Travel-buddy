"use client";

import { useId, type ReactNode } from "react";

import { cn } from "../cn";

/**
 * Toggle — a switch for a boolean the user sets deliberately.
 *
 * A real `<button role="switch">` with `aria-checked`, not a styled checkbox.
 * The distinction matters: a checkbox is a value in a form, a switch is an
 * immediate effect, and mixing the two up makes "did I save that?" a real
 * question for the user.
 */
export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  /** Shown under the label. Keep it a fact, not reassurance. */
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Toggle({ checked, onChange, label, hint, disabled, className, id }: ToggleProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <label htmlFor={inputId} className="block text-body text-ink">
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="mt-0.5 text-meta-sm text-ink-muted">
            {hint}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        id={inputId}
        role="switch"
        aria-checked={checked}
        aria-describedby={hintId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border",
          "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]",
          "disabled:cursor-not-allowed disabled:opacity-45",
          checked ? "border-accent bg-accent" : "border-rule bg-accent-soft",
        )}
      >
        <span className="sr-only">{checked ? "On" : "Off"}</span>
        <span
          aria-hidden
          className={cn(
            "block size-4 rounded-full bg-surface shadow-raise-1",
            "transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

/* ========================================================================== */

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Formats the current value for the visible readout. Always shown. */
  format: (value: number) => string;
  label: string;
  /** Printed under the track, at the two ends. */
  minLabel?: string;
  maxLabel?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}

/**
 * Slider — for the two primary constraints, time and budget.
 *
 * A native `<input type="range">` under a custom track, not a div with
 * pointer handlers. That gets keyboard support, the arrow keys, Home/End, and
 * screen-reader announcement of the value for free, and a hand-rolled slider
 * gets all four subtly wrong. The visible readout is what makes the state
 * legible: DESIGN_SYSTEM requires a real slider with rupee stops, and a
 * free-text budget must snap to it so the state is visible.
 */
export function Slider({
  value,
  onChange,
  min,
  max,
  step,
  format,
  label,
  minLabel,
  maxLabel,
  disabled,
  className,
  name,
}: SliderProps) {
  const id = useId();
  // Guard the division: a zero-width range would make this NaN and paint
  // nothing, which reads as "broken" rather than "empty".
  const span = max - min;
  const percent = span > 0 ? ((value - min) / span) * 100 : 0;
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-meta text-ink-muted">
          {label}
        </label>
        <output htmlFor={id} className="text-num text-ink">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        name={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "h-11 w-full cursor-pointer appearance-none bg-transparent",
          "disabled:cursor-not-allowed disabled:opacity-45",
          // The filled portion is painted with a gradient driven by --pct, so
          // the track and the thumb cannot drift apart.
          "[--pct:" + clamped.toFixed(2) + "%]",
          "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full",
          "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--accent)_0%,var(--accent)_var(--pct),var(--rule)_var(--pct),var(--rule)_100%)]",
          "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-rule",
          "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-accent",
          "[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-4",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent",
          "[&::-webkit-slider-thumb]:bg-surface",
          "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-[var(--dur-fast)]",
          "hover:[&::-webkit-slider-thumb]:scale-110",
          "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-surface",
        )}
      />
      {minLabel || maxLabel ? (
        <div className="flex justify-between text-meta-sm text-ink-muted">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ========================================================================== */

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Visually hidden description, announced when the option is selected. */
  description?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedControlOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/**
 * SegmentedControl — 2 to 4 mutually exclusive options.
 *
 * Radio semantics, not tabs: tabs change what panel is shown, a segmented
 * control changes a value. Getting this wrong makes a screen reader announce
 * "tab 2 of 3" for what is really a choice.
 *
 * Implemented with real `<input type="radio">` elements so arrow-key roving
 * focus and the group label come from the platform.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  const name = useId();

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="sr-only">{label}</legend>
      <div
        role="none"
        className="inline-flex min-h-11 w-full rounded-md border border-rule bg-canvas p-0.5"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex flex-1 cursor-pointer items-center justify-center rounded-sm px-2",
                "text-meta transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]",
                option.disabled && "cursor-not-allowed opacity-45",
                selected ? "bg-surface text-ink shadow-raise-1" : "text-ink-muted hover:text-ink",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                disabled={option.disabled}
                title={option.description}
                onChange={() => onChange(option.value)}
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
              <span className="truncate">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
