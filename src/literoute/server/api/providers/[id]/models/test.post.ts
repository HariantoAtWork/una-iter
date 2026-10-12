type Body = {
  ids?: string[]
}

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Provider id is required' })
  }

  const body = await readBody<Body>(event).catch(() => ({} as Body))
  return testProviderModels(id, body.ids, event)
})
