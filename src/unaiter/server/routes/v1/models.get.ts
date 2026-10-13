/**
 * OpenAI-compatible model list.
 * Returns enabled models from the admin catalogue (disabled models are omitted).
 */
export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/json; charset=utf-8')
  return listEnabledOpenAiModels(event)
})
