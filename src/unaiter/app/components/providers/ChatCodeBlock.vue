<script setup lang="ts">
/**
 * Chat fenced-code chrome, patterned on blog-harianto-dev's ProsePre:
 * language label, line-number toggle, wrap toggle, and copy-to-clipboard.
 * Highlighting is Shiki (same family of themes as the blog).
 */
import {
  chatHighlightTheme,
  highlightChatCode,
  type ChatHighlightTheme,
} from '~/utils/chatHighlight'

const props = defineProps<{
  code: string
  language?: string | null
}>()

const copied = ref(false)
/** Default on — matches the chat product requirement. */
const showLines = ref(true)
const wrapLines = ref(false)
const highlightedHtml = ref<string | null>(null)
const theme = ref<ChatHighlightTheme>(chatHighlightTheme())
let copyReset: ReturnType<typeof setTimeout> | undefined
let highlightSeq = 0
let media: MediaQueryList | null = null

const languageLabel = computed(() => {
  const lang = props.language?.trim()
  return lang || null
})

const copyLabel = computed(() => (copied.value ? 'Copied' : 'Copy'))

async function refreshHighlight() {
  const seq = ++highlightSeq
  highlightedHtml.value = null
  const html = await highlightChatCode(props.code, props.language, theme.value)
  if (seq === highlightSeq) {
    highlightedHtml.value = html
  }
}

function syncTheme() {
  theme.value = chatHighlightTheme()
}

watch(
  () => [props.code, props.language, theme.value] as const,
  () => {
    void refreshHighlight()
  },
  { immediate: true },
)

onMounted(() => {
  media = window.matchMedia('(prefers-color-scheme: light)')
  media.addEventListener('change', syncTheme)
})

function toggleLines() {
  showLines.value = !showLines.value
}

function toggleWrap() {
  wrapLines.value = !wrapLines.value
}

async function copyCode() {
  const text = props.code ?? ''
  if (!text || !import.meta.client) {
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    clearTimeout(copyReset)
    copyReset = setTimeout(() => {
      copied.value = false
    }, 1600)
  }
  catch {
    copied.value = false
  }
}

onBeforeUnmount(() => {
  clearTimeout(copyReset)
  highlightSeq += 1
  media?.removeEventListener('change', syncTheme)
})
</script>

<template>
  <div
    class="chat-code"
    :data-language="language || undefined"
    :data-lines="showLines ? 'on' : 'off'"
    :data-wrap="wrapLines ? 'on' : 'off'"
  >
    <div class="chat-code__toolbar">
      <span
        v-if="languageLabel"
        class="chat-code__lang"
      >{{ languageLabel }}</span>
      <span
        v-else
        class="chat-code__lang chat-code__lang--empty"
      >code</span>
      <div class="chat-code__tools">
        <button
          type="button"
          class="chat-code__tool"
          :class="{ 'chat-code__tool--on': showLines }"
          :aria-pressed="showLines"
          :aria-label="showLines ? 'Hide line numbers' : 'Show line numbers'"
          :title="showLines ? 'Hide line numbers' : 'Show line numbers'"
          @click="toggleLines"
        >
          <svg
            class="chat-code__icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 6h13" />
            <path d="M8 12h13" />
            <path d="M8 18h13" />
            <path d="M3 6h.01" />
            <path d="M3 12h.01" />
            <path d="M3 18h.01" />
          </svg>
        </button>
        <button
          type="button"
          class="chat-code__tool"
          :class="{ 'chat-code__tool--on': wrapLines }"
          :aria-pressed="wrapLines"
          :aria-label="wrapLines ? 'Unwrap lines' : 'Wrap lines'"
          :title="wrapLines ? 'Unwrap lines' : 'Wrap lines'"
          @click="toggleWrap"
        >
          <svg
            class="chat-code__icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M3 12h15a3 3 0 1 1 0 6h-4" />
            <polyline points="16 16 14 18 16 20" />
            <path d="M3 18h7" />
          </svg>
        </button>
        <button
          type="button"
          class="chat-code__tool"
          :class="{ 'chat-code__tool--done': copied }"
          :aria-label="copied ? 'Copied to clipboard' : 'Copy code to clipboard'"
          @click="copyCode"
        >
          <svg
            v-if="!copied"
            class="chat-code__icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="9"
              y="9"
              width="13"
              height="13"
              rx="2"
            />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
          <svg
            v-else
            class="chat-code__icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{{ copyLabel }}</span>
        </button>
      </div>
    </div>
    <div
      class="chat-code__scroll"
      tabindex="0"
      role="region"
      aria-label="Code snippet"
    >
      <div
        v-if="highlightedHtml"
        class="chat-code__shiki"
        v-html="highlightedHtml"
      />
      <pre v-else><code>{{ code }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.chat-code {
  position: relative;
  margin: 0.5em 0;
  max-width: 100%;
  min-width: 0;
  border: 1px solid var(--ui-border-accented);
  border-radius: 0.5rem;
  background: #0a0c10;
  overflow: clip;
}

.chat-code__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.35rem 0.5rem 0.35rem 0.75rem;
  border-bottom: 1px solid var(--ui-border-accented);
  background: #161b22;
}

.chat-code__lang {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8b949e;
}

.chat-code__lang--empty {
  visibility: hidden;
}

.chat-code__tools {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.28rem;
}

.chat-code__tool {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  border: 1px solid var(--ui-border-accented);
  border-radius: 0.4rem;
  padding: 0.25rem 0.45rem;
  background: transparent;
  color: #8b949e;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
  cursor: pointer;
}

.chat-code__tool:hover {
  color: #e6edf3;
  background: #30363d;
}

.chat-code__tool:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.chat-code__tool--on,
.chat-code__tool--done {
  color: #e6edf3;
  border-color: #58a6ff;
  background: #21262d;
}

.chat-code__icon {
  flex-shrink: 0;
  display: block;
}

.chat-code__scroll {
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}

.chat-code__scroll:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: -2px;
}

.chat-code :deep(pre) {
  margin: 0;
  max-width: none;
  overflow-x: visible;
  width: max-content;
  min-width: 100%;
  padding: 0.75rem 0;
  border: 0;
  border-radius: 0;
  background: transparent !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
  /* Cap leading so consecutive lines sit ~0.5rem apart beyond the glyph height. */
  line-height: calc(1em + 0.5rem);
}

.chat-code :deep(code) {
  /* Flex column collapses stray text-node gaps Shiki leaves between `.line` spans. */
  display: flex;
  flex-direction: column;
  min-width: 100%;
  background: transparent !important;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.chat-code :deep(.line) {
  display: block;
  width: max-content;
  min-width: 100%;
  min-height: calc(1em + 0.5rem);
  box-sizing: border-box;
  padding: 0 1rem;
  line-height: calc(1em + 0.5rem);
}

.chat-code[data-lines='on'] :deep(code) {
  counter-reset: chat-line;
}

.chat-code[data-lines='on'] :deep(.line) {
  /* Gutter inset + digit column + 0.5rem gap before the code. */
  padding-left: calc(0.5rem + 2.5ch + 0.5rem);
  position: relative;
}

.chat-code[data-lines='on'] :deep(.line)::before {
  counter-increment: chat-line;
  content: counter(chat-line);
  position: absolute;
  left: 0.5rem;
  width: 2.5ch;
  text-align: right;
  color: #6e7681;
  font-variant-numeric: tabular-nums;
  user-select: none;
}

.chat-code[data-wrap='on'] .chat-code__scroll {
  overflow-x: hidden;
}

.chat-code[data-wrap='on'] :deep(pre),
.chat-code[data-wrap='on'] :deep(code),
.chat-code[data-wrap='on'] :deep(.line) {
  width: 100%;
  max-width: 100%;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
