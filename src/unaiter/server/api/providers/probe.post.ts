type Body = {
  baseUrl?: string
  apiKey?: string
  adapterId?: string
}

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const body = await readBody<Body>(event)
  const baseUrl = (body.baseUrl || '').trim().replace(/\/+$/, '')

  if (!baseUrl || !URL.canParse(baseUrl)) {
    throw createError({ statusCode: 400, statusMessage: 'Base URL is invalid' })
  }

  return probeOpenAiCompatibleBaseUrl(baseUrl, (body.apiKey || '').trim(), {
    adapterId: body.adapterId,
  })
})
