type Body = {
  ids?: string[]
}

/** Enqueue a model test job for this provider (runs when the provider slot is free). */
export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Provider id is required' })
  }

  const body = (await readBody<Body>(event).catch(() => null)) || {}
  return enqueueProviderModelTest(id, body.ids, event)
})
