type Body = {
  name?: string
  slug?: string
  baseUrl?: string
  keys?: string
  validateKeys?: boolean
}

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Provider id is required' })
  }

  const body = await readBody<Body>(event)

  return updateProvider(id, {
    name: body.name || '',
    slug: body.slug,
    baseUrl: body.baseUrl || '',
    keysRaw: body.keys,
    validateKeys: body.validateKeys,
  }, event)
})
