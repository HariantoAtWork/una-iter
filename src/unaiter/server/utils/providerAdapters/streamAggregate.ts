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
