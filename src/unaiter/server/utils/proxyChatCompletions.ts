import type { H3Event } from 'h3'
import {
  applyOpenCodeFreeTierBody,
  aggregateOpenAiChatStream,
  isOpenCodeBaseUrl,
  openCodeUpstreamHeaders,
  resolveOpenCodeApiKey,
  resolveOpenCodeBaseUrl,
} from './opencodeFingerprint'
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

function upstreamHeaders(
  apiKey: string,
  baseUrl: string,
  modelId = '',
): Record<string, string> {
  if (isOpenCodeBaseUrl(baseUrl)) {
    return openCodeUpstreamHeaders(resolveOpenCodeApiKey(apiKey, modelId))
  }
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }
  return headers
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

  const routed = resolveRoutedModel(publicModelId, event)
  const triedKeyIds = new Set<string>()
  // Local providers may have zero keys; still allow a single no-auth attempt.
  const maxAttempts = Math.max(1, routed.provider.keys.length)
  const openCode = isOpenCodeBaseUrl(routed.provider.baseUrl)

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const provider = attempt === 0
      ? routed.provider
      : reloadProvider(routed.provider.id, event)

    const key = provider.keys.length === 0 ? null : pickProviderKey(provider)
    if (key) {
      if (triedKeyIds.has(key.id)) {
        break
      }
      triedKeyIds.add(key.id)
    }

    let upstreamBody: Record<string, unknown> = {
      ...body,
      model: routed.upstreamModelId,
    }
    let forcedStream = false
    if (openCode) {
      const patched = applyOpenCodeFreeTierBody(upstreamBody)
      upstreamBody = patched.body
      forcedStream = patched.forcedStream
    }

    const baseUrl = resolveOpenCodeBaseUrl(provider.baseUrl)
    const upstreamUrl = `${baseUrl}/chat/completions`
    let response: Response
    try {
      response = await fetch(upstreamUrl, {
        method: 'POST',
        headers: upstreamHeaders(key?.key || '', provider.baseUrl, routed.upstreamModelId),
        body: JSON.stringify(upstreamBody),
        signal: AbortSignal.timeout(120_000),
      })
    }
    catch {
      if (key) {
        markKeyExhausted(provider.id, key.id, event)
        continue
      }
      throw createError({
        statusCode: 502,
        statusMessage: `Upstream provider "${provider.slug}" is unreachable`,
      })
    }

    if (key && isExhaustedStatus(response.status) && attempt < maxAttempts - 1) {
      markKeyExhausted(provider.id, key.id, event)
      // Drain body so the connection can close cleanly.
      await response.arrayBuffer().catch(() => undefined)
      continue
    }

    // OpenCode free tier requires stream:true; re-aggregate when the client asked for JSON.
    if (openCode && forcedStream && response.ok && response.body) {
      const aggregated = await aggregateOpenAiChatStream(response)
      setResponseStatus(event, aggregated.status)
      setHeader(event, 'Content-Type', 'application/json')
      return aggregated.payload
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
