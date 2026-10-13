type Body = {
  direction?: 'up' | 'down'
  toIndex?: number
}

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

  const body = await readBody<Body>(event)
  const hasDirection = body.direction === 'up' || body.direction === 'down'
  const hasIndex = typeof body.toIndex === 'number'

  if (!hasDirection && !hasIndex) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Provide direction ("up"|"down") or toIndex',
    })
  }

  return moveProviderKey(id, keyId, {
    direction: hasDirection ? body.direction : undefined,
    toIndex: hasIndex ? body.toIndex : undefined,
  }, event)
})
