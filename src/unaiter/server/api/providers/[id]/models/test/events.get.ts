import { createEventStream } from 'h3'

/**
 * SSE stream for a provider's model test queue.
 * Replays the latest job history, then live events. Disconnecting does not cancel jobs.
 */
export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Provider id is required' })
  }

  const eventStream = createEventStream(event, { autoclose: true })

  const unsubscribe = subscribeProviderModelTest(id, (payload) => {
    void eventStream.push({
      event: payload.type,
      data: JSON.stringify(payload),
    })
  })

  eventStream.onClosed(() => {
    unsubscribe()
  })

  return eventStream.send()
})
