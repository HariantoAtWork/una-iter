/**
 * In-app chat completions (admin session only).
 * Unlike the public `/v1/chat/completions` endpoint, this route may talk to
 * disabled models so the chat modal can test them before enabling.
 */
export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  return proxyChatCompletions(event, { allowDisabled: true })
})
