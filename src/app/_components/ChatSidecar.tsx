"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Send } from "lucide-react";

import { DialogueDecision, type DiscoveryContext } from "@/contracts";

import { cn } from "@/components/cn";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Overlays";

/** The four wire events the route emits. Mirrors the route's `StreamEvent`. */
type WireEvent =
  | { type: "delta"; text: string }
  | { type: "decision"; decision: DialogueDecision }
  | { type: "done"; confidence: number; degraded: boolean };

export interface ChatSidecarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: DiscoveryContext;
  /**
   * Receives a validated `DialogueDecision`.
   *
   * The contract is `.strict()` and its `contextPatch` has no field that could
   * carry a recommendation, a reordering or a feasibility result — so this
   * handler cannot act on a plan even if it tried. The narrowness is structural,
   * not a matter of the handler being careful.
   */
  onDecision: (decision: DialogueDecision) => void;
}

/** Below this the contract says ask rather than act. */
const CONFIDENCE_GATE = 0.5;

/**
 * ChatSidecar — streaming, with suggestion chips.
 *
 * Three rules from docs/FEATURES.md §4 that this component exists to enforce:
 *
 * 1. It edits the CONTEXT, never the plan. The engine re-derives the plan from
 *    the patched context. If the user wants to swap a specific stop, that is a
 *    direct action on the plan, not a chat message — because a model that can
 *    reorder a plan is a model that can lie about what fits.
 * 2. `confidence < 0.5` asks a clarifying question instead of acting. Below the
 *    gate the suggestions become the question.
 * 3. The reply must state what changed.
 *
 * Chips are not a convenience. The common utterances are a fixed, small set, a
 * chip is faster than typing, and it demos better than a keyboard.
 */
export function ChatSidecar({ open, onOpenChange, context, onDecision }: ChatSidecarProps) {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [gate, setGate] = useState<{ confidence: number; suggestions: string[] } | null>(null);
  // Per instance rather than a hardcoded "chat-input": the sheet is a
  // singleton today, but a duplicate id would cross-wire the label to the
  // wrong field the moment a second one is ever mounted.
  const inputId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort an in-flight stream if the sheet closes, or the reply keeps writing
  // into a component nobody is looking at and the next open shows half a
  // sentence.
  useEffect(() => {
    if (open) return;
    abortRef.current?.abort();
    abortRef.current = null;
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [reply]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || busy) return;

      setInput("");
      setBusy(true);
      setReply("");
      setGate(null);
      setDegraded(false);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: trimmed, context }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setReply("The sidecar did not answer. The plan on the left is unaffected.");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line. A partial frame stays in
          // the buffer rather than being parsed, so a chunk boundary mid-JSON
          // does not produce a syntax error.
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
            if (!dataLine) continue;

            let event: WireEvent;
            try {
              event = JSON.parse(dataLine.slice(6)) as WireEvent;
            } catch {
              // A malformed frame is skipped, not fatal. One bad chunk should
              // not lose the reply that already streamed.
              continue;
            }

            if (event.type === "delta") {
              setReply((current) => current + event.text);
            } else if (event.type === "decision") {
              onDecision(event.decision);
              if (event.decision.confidence < CONFIDENCE_GATE) {
                setGate({
                  confidence: event.decision.confidence,
                  suggestions: event.decision.suggestions,
                });
              }
            } else if (event.type === "done") {
              setDegraded(event.degraded);
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setReply("The sidecar did not answer. The plan on the left is unaffected.");
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, context, onDecision],
  );

  const defaultChips = [
    "It started raining",
    "We lost 90 minutes",
    "Something step-free",
    "Nothing too crowded",
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title="Ask in words"
      label="Chat sidecar"
      className="flex flex-col"
    >
      {/*
        A note on what chat can and cannot do. It is one line, it is permanent,
        and it is the honest framing: the model patches your situation, the
        engine decides what fits. A user who thinks chat can re-rank the plan
        has been told something false.
      */}
      <p className="mb-3 rounded-sm bg-accent-soft px-2 py-1.5 text-meta-sm text-ink">
        This changes what we know about you. The plan is re-solved from scratch
        each time, so the ranking is never the model&rsquo;s to change.
      </p>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {reply ? (
          <p className="whitespace-pre-wrap text-body text-ink">{reply}</p>
        ) : (
          <p className="text-body text-ink-muted">
            Tell me what changed. A number, a need, or a mood all work.
          </p>
        )}

        {degraded ? (
          <p className="mt-2 text-meta-sm text-warn">
            Answered without the model, from a fixed set of readings. The plan is
            unaffected.
          </p>
        ) : null}
      </div>

      {/*
        Below the confidence gate this becomes the question rather than a
        suggestion list — the contract's own rule is to ask, and showing
        "here are some things you could have meant" when we are not sure is how
        a system guesses with the user's consent.
      */}
      {gate ? (
        <div className="mt-3 rounded-md border border-warn bg-warn-soft p-2.5">
          <p className="text-meta text-ink">
            I am not sure what you meant. Pick one and I will go on that.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {gate.suggestions.map((suggestion) => (
              <Chip key={suggestion} onClick={() => void send(suggestion)}>
                {suggestion}
              </Chip>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <span className="text-caps text-ink-muted">Try</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {defaultChips.map((chip) => (
              <Chip key={chip} onClick={() => void send(chip)}>
                {chip}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          What changed
        </label>
        <input
          id={inputId}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={busy}
          placeholder="It started raining"
          className={cn(
            "min-h-11 min-w-0 flex-1 rounded-md border border-rule bg-surface px-3",
            "text-body text-ink placeholder:text-ink-muted",
            "disabled:opacity-45",
          )}
        />
        <Button
          type="submit"
          variant="primary"
          iconOnly
          disabled={busy || input.trim().length === 0}
          aria-label="Send"
        >
          <Send aria-hidden className="size-4" strokeWidth={2} />
        </Button>
      </form>
    </Sheet>
  );
}

function Chip({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center rounded-full border border-rule bg-canvas",
        "px-3 text-meta text-ink",
        "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]",
        "hover:border-accent hover:bg-accent-soft",
      )}
    >
      {children}
    </button>
  );
}
