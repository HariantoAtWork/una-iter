function authHeaders(apiKey: string, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...extra,
  }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }
  return headers
}

export async function validateOpenAiCompatibleKey(
  baseUrl: string,
  apiKey: string,
): Promise<boolean> {
  const url = `${baseUrl.replace(/\/+$/, '')}/models`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: authHeaders(apiKey),
      signal: AbortSignal.timeout(12_000),
    })
    return response.ok
  }
  catch {
    return false
  }
}

export type BaseUrlProbeResult = {
  ok: boolean
  status: number | null
  modelCount: number | null
  error: string | null
}

/** Probe a base URL for availability without persisting anything. */
export async function probeOpenAiCompatibleBaseUrl(
  baseUrl: string,
  apiKey: string,
): Promise<BaseUrlProbeResult> {
  const url = `${baseUrl.replace(/\/+$/, '')}/models`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: authHeaders(apiKey),
      signal: AbortSignal.timeout(12_000),
    })

    let modelCount: number | null = null
    if (response.ok) {
      try {
        const payload = await response.json() as { data?: Array<{ id?: string }> }
        modelCount = Array.isArray(payload.data) ? payload.data.length : null
      }
      catch {
        modelCount = null
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      modelCount,
      error: response.ok ? null : `Endpoint returned ${response.status}`,
    }
  }
  catch (err) {
    const message = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
      ? 'Request timed out'
      : 'Could not reach the endpoint'
    return { ok: false, status: null, modelCount: null, error: message }
  }
}

export type FetchedModel = {
  id: string
  /** Context window in tokens when the provider advertises one. */
  contextLength: number | null
  /** Raw /models entry, passed through so no provider field is lost. */
  raw: Record<string, unknown>
}

/** Preferred key names, checked before a heuristic scan of the entry. */
const CONTEXT_LENGTH_KEYS = [
  'context_length',
  'max_context_length',
  'context_size',
  'context_window',
  'max_model_len',
  'max_position_embeddings',
] as const

/** Key names that plausibly mean "context window" on any provider. */
const CONTEXT_KEY_PATTERN = /(?:context|model)[_-]?(?:len|length|size|window)/i

function isPositiveTokenCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** Best-effort context length from OpenAI-compatible /models entries
 * (OpenRouter, Together, vLLM, …): known keys first, then any context-ish numeric field. */
function parseContextLength(entry: Record<string, unknown>): number | null {
  for (const key of CONTEXT_LENGTH_KEYS) {
    if (isPositiveTokenCount(entry[key])) {
      return entry[key]
    }
  }
  for (const [key, value] of Object.entries(entry)) {
    if (CONTEXT_KEY_PATTERN.test(key) && isPositiveTokenCount(value)) {
      return value
    }
  }
  return null
}

export async function fetchOpenAiCompatibleModels(
  baseUrl: string,
  apiKey: string,
): Promise<FetchedModel[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/models`

  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders(apiKey),
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Provider /models returned ${response.status}`,
    })
  }

  const payload = await response.json() as {
    data?: Array<Record<string, unknown>>
  }

  const seen = new Set<string>()
  const models: FetchedModel[] = []

  for (const item of payload.data || []) {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    if (!id || seen.has(id)) {
      continue
    }
    seen.add(id)
    models.push({ id, contextLength: parseContextLength(item), raw: item })
  }

  return models
}

/** Lightweight probe: tiny chat completion. Failures mean the model is not usable. */
export async function testOpenAiCompatibleModel(
  baseUrl: string,
  apiKey: string,
  modelId: string,
): Promise<boolean> {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(apiKey, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        model: modelId,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      signal: AbortSignal.timeout(30_000),
    })
    return response.ok
  }
  catch {
    return false
  }
}
