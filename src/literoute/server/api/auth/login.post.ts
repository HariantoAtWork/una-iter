type LoginBody = {
  username?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const username = body.username?.trim() ?? ''
  const password = body.password ?? ''

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username/email and password are required',
    })
  }

  const config = useRuntimeConfig(event)
  const expectedUser = String(config.administratorUsername || 'admin')
  const expectedPass = String(config.administratorPassword || '')

  if (!expectedPass) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Administrator password is not configured',
    })
  }

  const userOk = safeEqual(username, expectedUser)
  const passOk = safeEqual(password, expectedPass)

  if (!userOk || !passOk) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid username/email or password',
    })
  }

  const session = await useAuthSession(event)
  await session.update({
    user: { username },
  })

  return { ok: true, user: { username } }
})
