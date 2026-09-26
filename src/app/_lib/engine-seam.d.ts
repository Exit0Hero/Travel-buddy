/**
 * Ambient declaration for the engine seam.
 *
 * DELETE THIS FILE THE MOMENT `src/engine/index.ts` LANDS.
 *
 * NAMING. This file is `engine-seam.d.ts`, NOT `engine.d.ts`. TypeScript pairs
 * a sibling `foo.d.ts` with `foo.ts` as its declaration companion, so naming it
 * `engine.d.ts` silently made it the types FOR `engine.ts` instead of an
 * ambient module declaration, and the seam failed to resolve with no error
 * pointing at the cause.
 *
 * WHY IT EXISTS. `src/app/_lib/engine.ts` imports the engine dynamically so
 * the app runs before Abhijit's stream is merged. TypeScript cannot resolve a
 * module that does not exist, so the dynamic import is a build error rather
 * than a runtime branch — which means the "no edit on integration" property
 * cannot be expressed without a declaration.
 *
 * This file declares the module's SHAPE, transcribed from the public API in
 * TASKS.md. It is deliberately a declaration and not an implementation: the
 * app cannot accidentally satisfy the engine's contract by importing this,
 * because a `.d.ts` emits nothing.
 *
 * HOW DRIFT IS CAUGHT — AND WHAT THIS FILE CANNOT DO.
 *
 * An ambient module declaration is invisible to the typechecker once it exists.
 * `tsc` resolves `@/engine` to THIS file and never to a real one, so once it is
 * present the typechecker is satisfied by the FICTION. An earlier version of
 * this comment claimed that `satisfies EngineApi` in engine.ts would "break
 * typecheck" on a change to the seam. That was false: `satisfies` checks this
 * declaration against the shape the UI assumes, and both sides are code in this
 * directory. It cannot compare either one to an engine that does not exist yet.
 *
 * So the real protections are, in order of strength:
 *
 *  1. `tests/engine-seam.test.ts` imports the REAL `@/engine` and asserts every
 *     declared export is a function. It is enabled by the presence of
 *     `src/engine/index.ts`, so the day the engine lands the same commit starts
 *     enforcing this contract with no edit here. This is the only check that
 *     compares the declaration against a real module.
 *  2. That test also asserts the runtime guard in `engine.ts` and its own copy
 *     of the contract still agree, so the two lists cannot drift apart while the
 *     engine is still absent.
 *  3. `loadEngine()` checks at runtime that all eleven exports exist before the
 *     app calls any of them. This is DEFENCE IN DEPTH, not the primary gate: it
 *     runs per request, it reports a missing engine honestly to the user, and it
 *     keeps a partial engine from producing a half-built plan. It cannot catch
 *     a wrong SIGNATURE, only a missing export.
 *
 * What actually enforces the contract is the engine integration itself: when
 * `src/engine/index.ts` lands it must satisfy this declaration, and the fix for
 * any mismatch is to delete this file and correct the seam — not to widen a type
 * at the call site.
 */
declare module "@/engine" {
  import type {
    ContextChange,
    DiscoveryContext,
    Experience,
    Plan,
    ReplanResult,
    ValidationResult,
  } from "@/contracts";

  export function retrieve(input: {
    context: DiscoveryContext;
    catalogue: Experience[];
    limit?: number;
  }): Experience[];

  export function filterFeasible(
    ctx: DiscoveryContext,
    items: Experience[],
  ): { passed: string[]; rejected: Plan["rejected"] };

  export function score(
    ctx: DiscoveryContext,
    items: Experience[],
    weights: unknown,
  ): Plan["stops"][number]["score"][];

  export function pack(ctx: DiscoveryContext, items: Experience[]): Plan;

  export function validate(plan: Plan): ValidationResult;

  export function replan(
    prev: Plan,
    ctx: DiscoveryContext,
    change: ContextChange,
  ): ReplanResult;

  export function computeFit(
    ctx: DiscoveryContext,
    exp: Experience,
  ): Plan["stops"][number]["fit"];

  export function stress(plan: Plan, ctx: DiscoveryContext): {
    score: number;
    factors: Plan["stressFactors"];
  };

  export function isOpenDuring(
    hours: unknown,
    fromMin: number,
    toMin: number,
    lat: number,
    lon: number,
  ): { open: boolean; status: "ok" | "partial" | "unparsable" | "absent" };

  export function travelBetween(
    from: { lat: number; lon: number },
    to: { lat: number; lon: number },
    mode: "walk" | "auto" | "transit" | "ferry",
    atMin: number,
  ): Plan["legs"][number];

  export function observe(profile: unknown, event: unknown): unknown;
}
