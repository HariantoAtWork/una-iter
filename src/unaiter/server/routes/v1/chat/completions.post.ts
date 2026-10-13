/**
 * OpenAI-compatible chat completions.
 * `model` must be `{providerSlug}/{modelId}` so Unaiter can route to the right upstream.
 */
export default defineEventHandler(async (event) => {
  return proxyChatCompletions(event)
})
