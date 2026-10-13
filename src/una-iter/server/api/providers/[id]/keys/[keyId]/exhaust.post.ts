export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  const keyId = getRouterParam(event, 'keyId')

  if (!id || !keyId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Provider id and key id are required',
    })
  }

  return exhaustProviderKey(id, keyId, event)
})
