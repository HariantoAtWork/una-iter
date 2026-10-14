import type { Highlighter } from 'shiki'

export type ChatHighlightTheme =
  | 'github-dark-high-contrast'
  | 'github-light-high-contrast'

const THEME_DARK = 'github-dark-high-contrast' as const
const THEME_LIGHT = 'github-light-high-contrast' as const

/** Common languages for chat replies; unknown langs fall back to plain text. */
const LANGS = [
  'bash',
  'css',
  'dockerfile',
  'go',
  'html',
  'javascript',
  'json',
  'jsx',
  'markdown',
  'python',
  'rust',
  'shell',
  'sql',
  'tsx',
  'typescript',
  'vue',
  'yaml',
] as const

const cache = new Map<string, string>()
let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        themes: [THEME_DARK, THEME_LIGHT],
        langs: [...LANGS],
      }),
    )
  }
  return highlighterPromise
}

/** Match Nuxt UI / system preference: light only when explicitly preferred. */
export function chatHighlightTheme(): ChatHighlightTheme {
  if (!import.meta.client) {
    return THEME_DARK
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? THEME_LIGHT
    : THEME_DARK
}

function resolveLang(language: string | null | undefined): string {
  if (!language) {
    return 'text'
  }
  const normalised = language.trim().toLowerCase()
  if (!normalised) {
    return 'text'
  }
  if ((LANGS as readonly string[]).includes(normalised)) {
    return normalised
  }
  if (normalised === 'js') {
    return 'javascript'
  }
  if (normalised === 'ts') {
    return 'typescript'
  }
  if (normalised === 'sh' || normalised === 'zsh') {
    return 'shell'
  }
  if (normalised === 'yml') {
    return 'yaml'
  }
  if (normalised === 'md') {
    return 'markdown'
  }
  return 'text'
}

/** Highlight a fenced chat code block. Returns Shiki HTML (with `.line` spans) or null. */
export async function highlightChatCode(
  code: string,
  language: string | null | undefined,
  theme: ChatHighlightTheme = chatHighlightTheme(),
): Promise<string | null> {
  if (!import.meta.client || !code) {
    return null
  }
  const lang = resolveLang(language)
  const key = `${theme}\0${lang}\0${code}`
  const cached = cache.get(key)
  if (cached) {
    return cached
  }

  try {
    const highlighter = await getHighlighter()
    const html = highlighter.codeToHtml(code, {
      lang,
      theme,
    })
    cache.set(key, html)
    return html
  }
  catch {
    return null
  }
}
