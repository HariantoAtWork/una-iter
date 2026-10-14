import type { Token } from 'marked'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

export type ChatMarkdownSegment =
  | { type: 'html', html: string }
  | { type: 'code', code: string, language: string | null }

/**
 * Split Markdown into HTML segments and fenced code blocks so code can be
 * rendered as a Vue component (toolbar toggles) instead of sanitised HTML.
 */
export function parseChatMarkdown(content: string): ChatMarkdownSegment[] {
  const tokens = marked.lexer(content)
  const segments: ChatMarkdownSegment[] = []
  let buffer: Token[] = []

  const flush = () => {
    if (!buffer.length) {
      return
    }
    let html = marked.parser(buffer)
    // Wide tables need a scroll wrapper; a bare <table> cannot scroll itself.
    html = html.replace(
      /<table>[\s\S]*?<\/table>/g,
      table => `<div class="chat-md-table">${table}</div>`,
    )
    segments.push({ type: 'html', html })
    buffer = []
  }

  for (const token of tokens) {
    if (token.type === 'code') {
      flush()
      segments.push({
        type: 'code',
        code: token.text.replace(/\n$/, ''),
        language: token.lang?.trim() || null,
      })
    }
    else {
      buffer.push(token)
    }
  }
  flush()
  return segments
}
