import type { ProviderAdapter } from './types'

export const DEFAULT_ADAPTER_ID = 'default'

export const defaultAdapter: ProviderAdapter = {
  id: DEFAULT_ADAPTER_ID,
  label: 'OpenAI-compatible',
  resolveBaseUrl(baseUrl) {
    return baseUrl.replace(/\/+$/, '')
  },
  resolveApiKey(apiKey) {
    return apiKey
  },
  upstreamHeaders(apiKey) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }
    return headers
  },
  prepareChatBody(body) {
    return { body, forcedStream: false }
  },
  async finalizeChatResponse() {
    return null
  },
}
