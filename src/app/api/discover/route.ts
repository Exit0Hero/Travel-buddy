import { NextResponse } from "next/server";

import { ContextChange, DiscoveryContext } from "@/contracts";

import { discover, loadEngine, replan } from "../../_lib/engine";

/**
 * POST /api/discover — run the pipeline and return a Plan.
 *
 * The route is thin on purpose. It validates the incoming context against the
 * frozen contract, hands it to the engine seam, and returns what comes back. It
 * does not filter, score, rank or pack anything: a UI that re-implements a
 * check produces two answers to the same question, and the eval table would
 * then be measuring whichever one happened to run.
 *
 * The `x-engine` response header reports whether the real engine answered or
 * the fixtures did. A demo that silently showed fixture data while claiming to
 * be live would be the one dishonest thing this product could do, so the stub
 * state is visible in the response rather than hidden in a log.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body was not valid JSON." },
      { status: 400 },
    );
  }

  // Parse, do not cast. A context that violates the contract must fail here
  // with a field path, not render as `undefined` three components deep.
  const parsed = DiscoveryContext.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "That context does not satisfy the frozen contract.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }

  const engine = await loadEngine();
  const { plan, source, validation } = await discover(parsed.data);

  // Narrow the union: `reason` only exists on the not-ready branch, and the
  // header must say WHY the fixtures answered rather than just that they did.
  const note = engine.ready ? "engine" : engine.reason;

  return NextResponse.json(
    { plan, validation },
    {
      status: 200,
      headers: {
        "x-engine": source,
        "x-engine-note": note,
      },
    },
  );
}

/**
 * POST /api/replan — the "reality changed" path.
 *
 * Returns the swap diff, not just a new plan. The diff IS the feature: a
 * traveller who cannot see what was removed, what replaced it and why cannot
 * tell a repair from a replacement, and principle 3 of the masterplan is that
 * the original intent is never silently swapped out.
 */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body was not valid JSON." }, { status: 400 });
  }

  const payload = body as { plan?: unknown; context?: unknown; change?: unknown };

  const context = DiscoveryContext.safeParse(payload.context);
  if (!context.success) {
    return NextResponse.json(
      { error: "That context does not satisfy the frozen contract." },
      { status: 422 },
    );
  }

  const change = ContextChange.safeParse(payload.change);
  if (!change.success) {
    return NextResponse.json(
      { error: "That change does not satisfy the frozen contract." },
      { status: 422 },
    );
  }

  const { plan, source, validation } = await discover(context.data);
  const { result } = await replan(plan, context.data, change.data);

  return NextResponse.json(
    { result, validation },
    { status: 200, headers: { "x-engine": source } },
  );
}
