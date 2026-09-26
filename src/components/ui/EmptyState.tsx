import type { ReactNode } from "react";

import { cn } from "../cn";

/**
 * EmptyState — the highest-value copy in the product.
 *
 * DESIGN_SYSTEM §4: "Zero-result states are the highest-value copy in the
 * product." A search that returns nothing is the moment the user is closest to
 * leaving, and the difference between "No results" and a cause plus a way
 * forward is the difference between a dead end and a product.
 *
 * So the shape is fixed: say what happened, say which constraint caused it,
 * and always offer at least one action. `cause` is not optional in spirit even
 * though it is optional in the type — if you cannot name the cause, you do not
 * know what you are looking at, and the honest copy is the "no data at all"
 * branch.
 *
 * The copy must be a finished sentence with a real number in it. Never
 * "No results found", never "Constraint violated".
 */
export type EmptyKind =
  /** Constraints too tight. Offer the cheapest one to relax. */
  | "constraints"
  /** Nothing in this area. Offer a larger radius. */
  | "area"
  /** No catalogue coverage at all. Offer to add the first one. */
  | "no_data"
  /** One constraint eliminated everything, typically hours. */
  | "blocked";

export interface EmptyStateProps {
  kind: EmptyKind;
  /** The finished sentence. Real numbers, not placeholders. */
  title: string;
  /** Which constraint did it, and by how much. */
  body?: ReactNode;
  /** Actions. Always at least one — a dead end with no exit is a bug. */
  actions?: ReactNode;
  /** "Try:" chips. Faster than typing, and they demo better. */
  suggestions?: ReadonlyArray<string>;
  onSuggestion?: (suggestion: string) => void;
  className?: string;
  /** Tone. `alarm` is only for a genuine failure, never for "nothing here". */
  tone?: "neutral" | "alarm";
}

export function EmptyState({
  kind,
  title,
  body,
  actions,
  suggestions,
  onSuggestion,
  className,
  tone = "neutral",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-rule bg-surface p-6",
        "flex flex-col items-start gap-3",
        className,
      )}
      // An empty result is a state change worth announcing, not decoration.
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* The glyph is decorative and differs per kind, so the shape carries
            the meaning before the words are read. */}
        <span
          aria-hidden
          className={cn(
            "mt-1 grid size-8 shrink-0 place-items-center rounded-full text-meta-sm font-data",
            tone === "alarm" ? "bg-alarm-soft text-alarm" : "bg-accent-soft text-ink-muted",
          )}
        >
          {kind === "blocked" ? "×" : kind === "no_data" ? "+" : kind === "area" ? "◎" : "!"}
        </span>
        <div className="min-w-0">
          <h2
            className={cn(
              "text-title",
              tone === "alarm" ? "text-alarm" : "text-ink",
            )}
          >
            {title}
          </h2>
          {body ? <div className="mt-1 text-body text-ink-muted">{body}</div> : null}
        </div>
      </div>

      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}

      {suggestions && suggestions.length > 0 ? (
        <div className="w-full">
          <div className="text-caps text-ink-muted">Try</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) =>
              onSuggestion ? (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSuggestion(suggestion)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-rule",
                    "bg-canvas px-3 text-meta text-ink",
                    "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]",
                    "hover:border-accent hover:bg-accent-soft",
                  )}
                >
                  {suggestion}
                </button>
              ) : (
                <span
                  key={suggestion}
                  className="inline-flex min-h-9 items-center rounded-full border border-rule bg-canvas px-3 text-meta text-ink-muted"
                >
                  {suggestion}
                </span>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
