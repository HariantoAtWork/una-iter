/** Snapshot of the current/last model test job for this provider. */
export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Provider id is required' })
  }

  return getProviderModelTestStatus(id)
})
