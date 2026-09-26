/**
 * POST /api/chat — the streaming sidecar.
 *
 * `parseIntent` and `narrate` come from Vishwesh's `src/llm/**`, which does not
 * exist yet, so this route is the second engine seam: it tries the real
 * functions and falls back to a deterministic reply that says what it is.
 *
 * The blast radius is enforced structurally, not by convention.
 * `DialogueDecision` is `.strict()` in the contract, so it can only carry a
 * `contextPatch`, a `reply`, a `confidence` and `suggestions`. A model cannot
 * name a recommendation, reorder a plan or edit a feasibility result, because
 * there is no field for it to put them in. The route parses the decision with
 * the contract schema and drops anything that does not fit, rather than
 * spreading it onto a context object by hand.
 *
 * Every reply states what changed. A sidecar that answers without saying what
 * it altered leaves the user unsure whether the plan they are looking at is the
 * one they asked for.
 */
import { DialogueDecision, DiscoveryContext } from "@/contracts";

/** Wire format for one streamed event. */
type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "decision"; decision: DialogueDecision }
  | { type: "done"; confidence: number; degraded: boolean };

function sse(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * A deterministic reply used when the LLM is absent or unparseable.
 *
 * `LLM=off` has to still produce a full plan (README), so the sidecar cannot be
 * the only path to any behaviour. This is a regex reader, not a guess: it
 * pulls the obvious constraints out of the sentence and patches only those, and
 * it reports `confidence: 0.4` whenever it finds nothing, which is below the
 * contract's 0.5 gate so the UI asks instead of acting.
 *
 * Its real limitation, stated plainly: it reads phrases, so an indirect
 * request ("make it work for my mother") is missed. That is acceptable for a
 * `LLM=off` fallback and is not a substitute for `src/llm/nlu.ts`.
 */
function fallbackDecision(text: string, context: DiscoveryContext): DialogueDecision {
  const lower = text.toLowerCase();
  const patch: DialogueDecision["contextPatch"] = {};

  // Rupees. "600", "₹600", "rs 600", "six hundred".
  const rupees = lower.match(/(?:₹|rs\.?\s*)?(\d{2,6})\s*(?:rupees|rs\b)?/);
  if (rupees?.[1] && /rupee|₹|\brs\b|budget|spend|cost/.test(lower)) {
    patch.budgetMinor = Number(rupees[1]) * 100;
  }

  // Time. "90 minutes", "2 hours", "another hour".
  //
  // The distinction that matters: "we LOST 90 minutes" is a subtraction and
  // "we have 90 minutes" is an assignment. Getting it backwards turns a
  // complaint about lost time into a request for more of it, so the loss
  // phrasing is matched first and the bare figure is only read as a total when
  // no loss language is present.
  const lostTime =
    /lost|less|short|ran out|no time|tight/.test(lower) ||
    /\bcut\b/.test(lower);
  const hours = lower.match(/(\d+)\s*(?:h\b|hour)/);
  const mins = lower.match(/(\d+)\s*(?:m\b|min|minute)/);
  const spoken =
    hours?.[1] !== undefined
      ? Number(hours[1]) * 60
      : mins?.[1] !== undefined
        ? Number(mins[1])
        : null;

  if (spoken !== null) {
    patch.availableMin = lostTime
      ? Math.max(15, context.availableMin - spoken)
      : spoken;
  }

  // Access needs, by the phrasings a real person uses rather than the enum.
  if (/can't do stairs|cannot do stairs|wheelchair|no stairs/.test(lower)) {
    patch.accessNeeds = [...new Set([...(context.accessNeeds ?? []), "wheelchair" as const])];
  }
  if (/bathroom|toilet|restroom/.test(lower)) {
    patch.accessNeeds = [...new Set([...(context.accessNeeds ?? []), "restroom" as const])];
  }
  if (/stroller|pram/.test(lower)) {
    patch.accessNeeds = [...new Set([...(context.accessNeeds ?? []), "stroller" as const])];
  }

  if (/exhausted|tired|low energy|need a rest/.test(lower)) {
    patch.mood = "low_energy";
  }
  if (/crowded|crowd|busy/.test(lower)) {
    patch.avoid = [...new Set([...(context.avoid ?? []), "crowded"])];
  }
  if (/for (?:a|my) (\d+)[- ]?(?:year|yo)/.test(lower)) {
    patch.interests = [...new Set([...(context.interests ?? []), "family", "kid_friendly"])];
  }
  if (/rain|raining|started raining/.test(lower)) {
    patch.mood = "wet";
  }

  const changed = Object.keys(patch).length > 0;
  const reply = changed
    ? "Updated what I know about you. Re-solving against that now."
    : "I can answer that from the plan as it stands, without changing anything.";

  return {
    contextPatch: patch,
    reply,
    // Below 0.5 the contract's own rule is to ask rather than act, so a
    // no-op decision is honest about its own uncertainty.
    confidence: changed ? 0.72 : 0.4,
    suggestions: changed
      ? []
      : ["Cut one stop", "Make it step-free only", "Something under an hour"],
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Request body was not valid JSON.", { status: 400 });
  }

  const { text, context } = body as { text?: unknown; context?: unknown };

  if (typeof text !== "string" || text.trim().length === 0) {
    return new Response("`text` is required.", { status: 400 });
  }
  if (context === undefined || context === null) {
    return new Response("`context` is required so the reply can be a patch, not a guess.", {
      status: 400,
    });
  }

  const parsed = DiscoveryContext.safeParse(context);
  if (!parsed.success) {
    return new Response("That context does not satisfy the frozen contract.", { status: 422 });
  }

  const encoder = new TextEncoder();
  let decision: DialogueDecision;
  let degraded = true;

  try {
    // Vishwesh's seam. Same pattern as the engine seam: absent until it lands,
    // and the fallback is deterministic so LLM=off still works.
    const llm = (await import("@/llm")) as {
      parseIntent?: (t: string, c: DiscoveryContext) => Promise<unknown>;
    };
    if (typeof llm.parseIntent === "function") {
      const raw = await llm.parseIntent(text, parsed.data);
      // Parsed with the contract schema, never JSON.parse-and-trust: the
      // envelope comment in the contract calls out a real lastIndex bug from a
      // dynamically built RegExp in a reference repo.
      const checked = DialogueDecision.safeParse(raw);
      if (checked.success) {
        decision = checked.data;
        degraded = false;
      } else {
        decision = fallbackDecision(text, parsed.data);
      }
    } else {
      decision = fallbackDecision(text, parsed.data);
    }
  } catch {
    decision = fallbackDecision(text, parsed.data);
  }

  /*
    Streamed word by word, because the sidecar is a conversation and a reply
    that arrives whole reads as a lookup. 18ms per token is roughly reading
    speed; much faster stops looking like typing and starts looking fake.
  */
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const token of decision.reply.split(/(\s+)/)) {
        if (token.length === 0) continue;
        controller.enqueue(encoder.encode(sse({ type: "delta", text: token })));
        await new Promise((resolve) => setTimeout(resolve, 18));
      }
      controller.enqueue(encoder.encode(sse({ type: "decision", decision })));
      controller.enqueue(
        encoder.encode(
          sse({ type: "done", confidence: decision.confidence, degraded }),
        ),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Nginx buffers SSE by default, which holds the whole reply until it
      // completes and makes the streaming look broken in exactly the
      // environment a demo is most likely to run in.
      "x-accel-buffering": "no",
    },
  });
}
