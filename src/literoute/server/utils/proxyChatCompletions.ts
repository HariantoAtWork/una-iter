import type { H3Event } from 'h3'
import {
  markKeyExhausted,
  pickProviderKey,
  reloadProvider,
  resolveRoutedModel,
} from './routeModel'

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-encoding',
  'content-length',
])

function isExhaustedStatus(status: number) {
  return status === 429 || status === 402
}

export async function proxyChatCompletions(event: H3Event) {
  const body = await readBody<Record<string, unknown>>(event)
  const publicModelId = typeof body?.model === 'string' ? body.model : ''

  if (!publicModelId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'model is required',
    })
  }

  let routed = resolveRoutedModel(publicModelId, event)
  const triedKeyIds = new Set<string>()
  const maxAttempts = Math.max(1, routed.provider.keys.length)

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const provider = attempt === 0
      ? routed.provider
      : reloadProvider(routed.provider.id, event)

    if (provider.keys.length === 0) {
      throw createError({
        statusCode: 503,
        statusMessage: `Provider "${provider.slug}" has no API keys`,
      })
    }

    const key = pickProviderKey(provider)
    if (triedKeyIds.has(key.id)) {
      break
    }
    triedKeyIds.add(key.id)

    const upstreamBody = {
      ...body,
      model: routed.upstreamModelId,
    }

    const upstreamUrl = `${provider.baseUrl.replace(/\/+$/, '')}/chat/completions`
    let response: Response
    try {
      response = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key.key}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(upstreamBody),
        signal: AbortSignal.timeout(120_000),
      })
    }
    catch {
      markKeyExhausted(provider.id, key.id, event)
      continue
    }

    if (isExhaustedStatus(response.status) && attempt < maxAttempts - 1) {
      markKeyExhausted(provider.id, key.id, event)
      // Drain body so the connection can close cleanly.
      await response.arrayBuffer().catch(() => undefined)
      continue
    }

    setResponseStatus(event, response.status)
    response.headers.forEach((value, name) => {
      if (!HOP_BY_HOP.has(name.toLowerCase())) {
        setHeader(event, name, value)
      }
    })

    if (!response.body) {
      return await response.text()
    }

    return sendStream(event, response.body)
  }

  throw createError({
    statusCode: 503,
    statusMessage: `All API keys exhausted for provider "${routed.provider.slug}"`,
  })
}
