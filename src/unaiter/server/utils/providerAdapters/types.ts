export type PrepareChatBodyResult = {
  body: Record<string, unknown>
  forcedStream: boolean
}

export type FinalizeChatResponseResult = {
  status: number
  headers: Headers
  payload: Record<string, unknown>
} | null

export type ProviderAdapter = {
  id: string
  /** Shown in Edit Provider. */
  label: string
  /** Optional URL hint for migration / preset inference only. */
  match?: (baseUrl: string) => boolean
  resolveBaseUrl: (baseUrl: string) => string
  resolveApiKey: (apiKey: string, modelId: string) => string
  upstreamHeaders: (
    apiKey: string,
    ctx?: { modelId?: string },
  ) => Record<string, string>
  prepareChatBody: (body: Record<string, unknown>) => PrepareChatBodyResult
  /**
   * When prepareChatBody forced stream but the client wanted JSON, return an
   * aggregated payload. Return null to passthrough the upstream response.
   */
  finalizeChatResponse: (
    response: Response,
    ctx: { forcedStream: boolean },
  ) => Promise<FinalizeChatResponseResult>
}

export type AdapterPublic = {
  id: string
  label: string
}

export type ResolveAdapterInput = {
  adapterId?: string | null
  baseUrl?: string | null
}
