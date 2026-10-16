type Body = {
  name?: string
  slug?: string
  baseUrl?: string
  adapterId?: string
  keys?: string
  validateKeys?: boolean
}

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)

  const body = await readBody<Body>(event)

  return createProvider({
    name: body.name || '',
    slug: body.slug,
    baseUrl: body.baseUrl || '',
    adapterId: body.adapterId,
    keysRaw: body.keys || '',
    validateKeys: body.validateKeys,
  }, event)
})
