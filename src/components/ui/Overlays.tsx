"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { X } from "lucide-react";

import { cn } from "../cn";

/**
 * The shared machinery behind Popover, Sheet and Dialog.
 *
 * Written once because the three of them have to agree on the things that are
 * easy to get subtly wrong per-component: focus moves in on open and returns
 * to the trigger on close, Escape closes, Tab is trapped in a modal but not in
 * a popover, and the background is marked `inert` so a screen reader cannot
 * wander out of the dialog into the page behind it.
 */

let openOverlayCount = 0;

/** Locks body scroll without the layout shift that `overflow: hidden` causes. */
function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    openOverlayCount += 1;

    return () => {
      openOverlayCount -= 1;
      if (openOverlayCount === 0) {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPadding;
      }
    };
  }, [active]);
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/** Escape to close, from anywhere. */
function useEscape(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onEscape();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}

/** Focus in on open, back to the trigger on close. */
function useFocusReturn(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  returnTo: RefObject<HTMLElement | null> | null,
  trap: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    /*
      Resolve the return target NOW, while the trigger is certainly still the
      element that opened this overlay.

      Reading `returnTo.current` inside the cleanup instead is a real bug: the
      ref is read at cleanup time, by which point the trigger may have
      unmounted and something else may occupy the ref — so focus lands on an
      unrelated element, or on nothing, and a keyboard user is dropped at the
      top of the document. The fallback to `previouslyFocused` is captured for
      the same reason.
    */
    const returnTarget = returnTo?.current ?? previouslyFocused;

    // Prefer the first focusable control, fall back to the container itself so
    // the dialog is never left with focus on the inert page behind it.
    const first = focusableWithin(container)[0];
    (first ?? container).focus({ preventScroll: true });

    if (!trap) {
      return () => {
        returnTarget?.focus({ preventScroll: true });
      };
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusableWithin(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (!firstItem || !lastItem) return;

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      returnTarget?.focus({ preventScroll: true });
    };
  }, [active, containerRef, returnTo, trap]);
}

/** Click-outside. Bound to pointerdown so it fires before a click lands. */
function useOutsideDismiss(
  active: boolean,
  refs: RefObject<HTMLElement | null>[],
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!active) return;
    const handler = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      for (const ref of refs) {
        if (ref.current?.contains(target)) return;
      }
      onDismiss();
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [active, refs, onDismiss]);
}

/* ========================================================================== */

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The trigger. Rendered as-is; you own its semantics. */
  trigger: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  label?: string;
}

/**
 * Popover — non-modal. The page behind stays interactive and reachable by
 * keyboard, because a popover that traps focus is a dialog wearing a hat.
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  side = "bottom",
  className,
  label,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEscape(open, close);
  useOutsideDismiss(open, [panelRef, triggerRef], close);
  useFocusReturn(open, panelRef, triggerRef, false);

  const position = {
    top: "bottom-full left-0 mb-2",
    bottom: "top-full left-0 mt-2",
    left: "right-full top-0 mr-2",
    right: "left-full top-0 ml-2",
  }[side];

  return (
    <div ref={triggerRef} className="relative inline-block">
      {trigger}
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label={label}
        hidden={!open}
        className={cn(
          "absolute z-dropdown rounded-md border border-rule bg-surface shadow-raise-2",
          position,
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ========================================================================== */

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  side?: "bottom" | "left" | "right";
  title?: ReactNode;
  /** Announced as the sheet's accessible name when `title` is not visible. */
  label?: string;
  className?: string;
}

/**
 * Sheet — a modal edge panel. Used on mobile where a dialog would be cramped.
 * Modal: traps focus, locks scroll, marks the page inert.
 */
export function Sheet({
  open,
  onOpenChange,
  children,
  side = "bottom",
  title,
  label,
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useScrollLock(open);
  useEscape(open, close);
  useFocusReturn(open, panelRef, null, true);

  const position = {
    bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-lg",
    left: "inset-y-0 left-0 w-[min(22rem,90vw)]",
    right: "inset-y-0 right-0 w-[min(22rem,90vw)]",
  }[side];

  const enter = {
    bottom: open ? "translate-y-0" : "translate-y-full",
    left: open ? "translate-x-0" : "-translate-x-full",
    right: open ? "translate-x-0" : "translate-x-full",
  }[side];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal" role="presentation">
      <div
        aria-hidden
        onClick={close}
        className="absolute inset-0 bg-[var(--scrim)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : label}
        tabIndex={-1}
        className={cn(
          "absolute overflow-y-auto border-rule bg-surface shadow-raise-2",
          "transition-transform duration-[var(--dur-base)] ease-[var(--ease-in-out)]",
          position,
          side === "bottom" ? "border-t" : "border-r",
          enter,
          className,
        )}
      >
        {side === "bottom" ? (
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-rule" />
        ) : null}
        {title ? (
          <div className="flex items-center justify-between gap-3 p-4 pb-0">
            <h2 className="text-title text-ink">{title}</h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid size-11 place-items-center rounded-md text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-accent-soft hover:text-ink"
            >
              <X aria-hidden className="size-5" strokeWidth={2} />
            </button>
          </div>
        ) : null}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ========================================================================== */

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  /** Rendered in the footer, after the close button. */
  footer?: ReactNode;
}

/**
 * Dialog — modal, centred. The confirm surface for anything irreversible
 * (confirming a booking, discarding a plan).
 */
export function Dialog({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
  footer,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useScrollLock(open);
  useEscape(open, close);
  useFocusReturn(open, panelRef, null, true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal grid place-items-center p-4" role="presentation">
      <div aria-hidden onClick={close} className="absolute inset-0 bg-[var(--scrim)]" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-lg rounded-lg border border-rule bg-surface shadow-raise-2",
          className,
        )}
      >
        <div className="p-5 pb-0">
          <h2 id={titleId} className="text-title text-ink">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="mt-1 text-meta text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        <div className="p-5">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-rule p-4">
          {footer}
          <button
            type="button"
            onClick={close}
            className="inline-flex min-h-11 items-center rounded-md border border-rule bg-surface px-4 text-body text-ink transition-colors duration-[var(--dur-fast)] hover:bg-accent-soft"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

/**
 * Tooltip — hover and focus, never hover-only.
 *
 * Deliberately not used for anything a user must read: a tooltip cannot be
 * reached by touch and disappears on blur. It labels icon buttons. Anything
 * more is a Popover.
 */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const id = useId();
  const position = side === "top" ? "bottom-full left-1/2 -translate-x-1/2 mb-1.5" : "top-full left-1/2 -translate-x-1/2 mt-1.5";

  return (
    <span className={cn("group relative inline-flex", className)}>
      <span aria-describedby={id} tabIndex={0} className="inline-flex">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-dropdown whitespace-nowrap rounded-sm",
          "border border-rule bg-surface px-2 py-1 text-meta-sm text-ink shadow-raise-1",
          "opacity-0 transition-opacity duration-[var(--dur-fast)]",
          "group-focus-within:opacity-100 group-hover:opacity-100",
          position,
        )}
      >
        {content}
      </span>
    </span>
  );
}
