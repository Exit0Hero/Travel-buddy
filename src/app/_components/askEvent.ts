/**
 * The one event the cinematic shell and the tool share.
 *
 * WHY IT LIVES IN ITS OWN FILE. The cinematic nav's "Ask Athiti" button and
 * `DiscoverySurface`'s chat sidecar are in different halves of the same page —
 * one above the fold, one below it. The obvious way to connect them is to lift
 * the chat's open state up into a parent, but that parent would be a server
 * component, and a server component should not own product state.
 *
 * So: one string constant, two small effects, no shared state and no prop
 * drilling. It is here rather than inside a nav component so that neither side
 * has to import the other, which also means the cinematic half can be deleted
 * without touching the tool.
 */
export const ASK_ATHITI_EVENT = "athiti:ask";
