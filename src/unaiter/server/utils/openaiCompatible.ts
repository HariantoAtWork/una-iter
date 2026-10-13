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

export async function fetchOpenAiCompatibleModels(
  baseUrl: string,
  apiKey: string,
): Promise<string[]> {
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
    data?: Array<{ id?: string }>
  }

  const ids = (payload.data || [])
    .map(item => item.id?.trim())
    .filter((id): id is string => Boolean(id))

  return [...new Set(ids)]
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
