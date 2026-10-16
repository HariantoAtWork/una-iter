/**
 * OpenCode free-tier client fingerprint.
 *
 * The gateway rejects free models unless the request looks like the official
 * OpenCode client: User-Agent `opencode/<semver>`, an `ses_`-shaped session id,
 * `stream: true`, and tools that include at least `bash` + `read`.
 *
 * See anomalyco/opencode#49433 and related free-tier gate discussions.
 */

const OPENCODE_UA_VERSION = '1.19.3'
/** Same alphabet OpenCode uses in `bZ` (A–Z, a–z, 0–9). */
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const ID_RANDOM_BYTES = 14

let lastIdMs = 0
let idCounter = 0

export function isOpenCodeBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.replace(/^www\./, '')
    return host === 'opencode.ai' || host.endsWith('.opencode.ai')
  }
  catch {
    return /opencode\.ai/i.test(baseUrl)
  }
}

/** Free-tier fingerprint only works on the OpenAI-compatible inference path. */
export const OPENCODE_INFERENCE_BASE = 'https://opencode.ai/inference/openai/v1'

export function resolveOpenCodeBaseUrl(baseUrl: string): string {
  if (!isOpenCodeBaseUrl(baseUrl)) {
    return baseUrl.replace(/\/+$/, '')
  }
  try {
    const url = new URL(baseUrl)
    if (url.pathname.includes('/inference')) {
      return OPENCODE_INFERENCE_BASE
    }
  }
  catch {
    // fall through
  }
  return baseUrl.replace(/\/+$/, '')
}

/**
 * Mirror of OpenCode's `Ume()` / `bZ(true)` session id:
 * `ses_` + 12 hex from `~(Date.now()*0x1000 + counter)` low 48 bits + 14 base62.
 */
export function createOpenCodeSessionId(nowMs: number = Date.now()): string {
  if (nowMs !== lastIdMs) {
    lastIdMs = nowMs
    idCounter = 0
  }
  idCounter += 1

  const stamped = BigInt(nowMs) * 0x1000n + BigInt(idCounter)
  // Session ids use the descending form (`~stamped`); other ids use ascending.
  const value = ~stamped
  let hex = ''
  for (let i = 0; i < 6; i += 1) {
    const byte = Number((value >> BigInt(40 - 8 * i)) & 0xffn)
    hex += byte.toString(16).padStart(2, '0')
  }

  const random = new Uint8Array(ID_RANDOM_BYTES)
  crypto.getRandomValues(random)
  let suffix = ''
  for (const byte of random) {
    suffix += BASE62[byte % 62]!
  }
  return `ses_${hex}${suffix}`
}

function toolNames(tools: unknown): Set<string> {
  const names = new Set<string>()
  if (!Array.isArray(tools)) {
    return names
  }
  for (const tool of tools) {
    if (!tool || typeof tool !== 'object') {
      continue
    }
    const entry = tool as { function?: { name?: string }, name?: string }
    const name = entry.function?.name || entry.name
    if (typeof name === 'string' && name) {
      names.add(name)
    }
  }
  return names
}

function stubTool(name: string, description: string, property: string) {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: {
        type: 'object',
        properties: { [property]: { type: 'string' } },
      },
    },
  }
}

/** Ensure bash + read are present (minimum free-tier toolset). */
export function ensureOpenCodeFreeTierTools(tools: unknown): unknown[] {
  const existing = Array.isArray(tools) ? [...tools] : []
  const names = toolNames(existing)
  if (!names.has('bash')) {
    existing.push(stubTool('bash', 'Run a shell command', 'command'))
  }
  if (!names.has('read')) {
    existing.push(stubTool('read', 'Read a file', 'path'))
  }
  return existing
}

/** Models the anonymous `public` key can serve (free tier). */
export function isOpenCodeFreeModel(modelId: string): boolean {
  const id = modelId.trim().toLowerCase()
  return id.endsWith('-free') || id === 'big-pickle'
}

/**
 * Prefer anonymous `public` for free models — stored keys may be read-only
 * Console keys that cannot call models.
 */
export function resolveOpenCodeApiKey(apiKey: string, modelId: string): string {
  if (isOpenCodeFreeModel(modelId)) {
    return 'public'
  }
  return apiKey.trim() || 'public'
}

export function openCodeUpstreamHeaders(
  apiKey: string,
  sessionId: string = createOpenCodeSessionId(),
): Record<string, string> {
  const key = apiKey.trim() || 'public'
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    'User-Agent': `opencode/${OPENCODE_UA_VERSION}`,
    'x-opencode-client': 'cli',
    'x-opencode-session': sessionId,
    'x-opencode-project': 'global',
  }
}

/**
 * Patch a chat-completions body so free-tier OpenCode models accept it.
 * Forces `stream: true` and injects bash/read tools when missing.
 */
export function applyOpenCodeFreeTierBody(
  body: Record<string, unknown>,
): { body: Record<string, unknown>, forcedStream: boolean } {
  const forcedStream = body.stream !== true
  return {
    body: {
      ...body,
      stream: true,
      tools: ensureOpenCodeFreeTierTools(body.tools),
    },
    forcedStream,
  }
}

/** Aggregate an OpenAI SSE stream into a single non-stream chat.completion. */
export async function aggregateOpenAiChatStream(
  response: Response,
): Promise<{ status: number, headers: Headers, payload: Record<string, unknown> }> {
  const text = await response.text()
  let id = ''
  let model = ''
  let created = Math.floor(Date.now() / 1000)
  let content = ''
  let reasoning = ''
  let finishReason: string | null = null

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) {
      continue
    }
    const data = trimmed.slice(5).trim()
    if (!data || data === '[DONE]') {
      continue
    }
    try {
      const chunk = JSON.parse(data) as {
        id?: string
        model?: string
        created?: number
        choices?: Array<{
          finish_reason?: string | null
          delta?: { content?: string, reasoning_content?: string }
        }>
      }
      if (chunk.id) {
        id = chunk.id
      }
      if (chunk.model) {
        model = chunk.model
      }
      if (typeof chunk.created === 'number') {
        created = chunk.created
      }
      const choice = chunk.choices?.[0]
      if (choice?.delta?.content) {
        content += choice.delta.content
      }
      if (choice?.delta?.reasoning_content) {
        reasoning += choice.delta.reasoning_content
      }
      if (choice?.finish_reason) {
        finishReason = choice.finish_reason
      }
    }
    catch {
      // ignore malformed SSE lines
    }
  }

  const message: Record<string, unknown> = {
    role: 'assistant',
    content,
  }
  if (reasoning) {
    message.reasoning_content = reasoning
  }

  return {
    status: response.status,
    headers: response.headers,
    payload: {
      id: id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created,
      model,
      choices: [{
        index: 0,
        message,
        finish_reason: finishReason || 'stop',
      }],
    },
  }
}
