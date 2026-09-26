/**
 * Ambient declaration for the LLM seam. Mirrors `engine-seam.d.ts`.
 *
 * DELETE THIS FILE THE MOMENT `src/llm/index.ts` LANDS.
 *
 * Named `llm-seam.d.ts` rather than `llm.d.ts` for the same reason as the
 * engine seam: TypeScript pairs a sibling `foo.d.ts` with `foo.ts` as its
 * declaration companion, so `llm.d.ts` would become the types FOR `llm.ts`
 * rather than an ambient module, and the seam would fail to resolve with no
 * error pointing at the cause.
 *
 * Only the two functions TASKS.md publishes are declared. `parseIntent` returns
 * the raw model output on purpose — the route then parses it with
 * `DialogueDecision.safeParse`, which is the enforcement mechanism for the
 * contract's claim that the model can only ever emit a context patch. If the
 * return type were already `DialogueDecision`, that guarantee would be an
 * assertion rather than a check.
 */
declare module "@/llm" {
  import type { DialogueDecision, DiscoveryContext, Plan } from "@/contracts";

  export function parseIntent(
    text: string,
    ctx: DiscoveryContext,
  ): Promise<DialogueDecision>;

  export function narrate(plan: Plan, ctx: DiscoveryContext): Promise<string>;
}
