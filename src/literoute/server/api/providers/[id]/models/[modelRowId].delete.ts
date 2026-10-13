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

  return deleteProviderModel(id, modelRowId, event)
})
