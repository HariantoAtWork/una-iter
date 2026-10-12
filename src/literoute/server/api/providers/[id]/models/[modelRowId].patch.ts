type Body = {
  enabled?: boolean
}

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  const modelRowId = getRouterParam(event, 'modelRowId')

  if (!id || !modelRowId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Provider id and model id are required',
    })
  }

  const body = await readBody<Body>(event)
  if (typeof body.enabled !== 'boolean') {
    throw createError({
      statusCode: 400,
      statusMessage: 'enabled (boolean) is required',
    })
  }

  return setProviderModelEnabled(id, modelRowId, body.enabled, event)
})
