/**
 * OpenAI-compatible chat completions.
 * `model` must be `{providerSlug}/{modelId}` so Literoute can route to the right upstream.
 */
export default defineEventHandler(async (event) => {
  return proxyChatCompletions(event)
})
