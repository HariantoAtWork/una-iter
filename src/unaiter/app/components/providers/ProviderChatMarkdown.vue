<script setup lang="ts">
import { parseChatMarkdown } from '~/utils/chatMarkdown'

const props = defineProps<{
  content: string
  /** When true the reply is still streaming: show plain text, skip Markdown. */
  streaming?: boolean
}>()

const segments = computed(() =>
  props.streaming ? [] : parseChatMarkdown(props.content),
)
</script>

<template>
  <div
    v-if="streaming"
    class="whitespace-pre-wrap break-words"
  >
    {{ props.content }}<span class="inline-block w-2 animate-pulse">▋</span>
  </div>
  <div
    v-else
    class="chat-md"
  >
    <template
      v-for="(segment, index) in segments"
      :key="index"
    >
      <ProvidersChatCodeBlock
        v-if="segment.type === 'code'"
        :code="segment.code"
        :language="segment.language"
      />
      <div
        v-else
        v-sanitize-html="segment.html"
      />
    </template>
  </div>
</template>

<style scoped>
/* Styling for marked HTML segments (code blocks are a separate Vue component). */
.chat-md :deep(> :first-child) {
  margin-top: 0;
}

.chat-md :deep(> :last-child) {
  margin-bottom: 0;
}

.chat-md :deep(p),
.chat-md :deep(ul),
.chat-md :deep(ol),
.chat-md :deep(blockquote),
.chat-md :deep(pre) {
  margin: 0.5em 0;
}

.chat-md :deep(ul),
.chat-md :deep(ol) {
  padding-left: 1.25rem;
}

.chat-md :deep(ul) {
  list-style: disc;
}

.chat-md :deep(ol) {
  list-style: decimal;
}

.chat-md :deep(h1),
.chat-md :deep(h2),
.chat-md :deep(h3),
.chat-md :deep(h4) {
  margin: 0.75em 0 0.35em;
  font-weight: 600;
  line-height: 1.25;
}

.chat-md :deep(h1) {
  font-size: 1.15em;
}

.chat-md :deep(h2) {
  font-size: 1.1em;
}

.chat-md :deep(h3),
.chat-md :deep(h4) {
  font-size: 1em;
}

.chat-md :deep(a) {
  color: var(--ui-primary);
  text-decoration: underline;
}

.chat-md :deep(blockquote) {
  border-left: 3px solid var(--ui-border-accented);
  padding-left: 0.75rem;
  color: var(--ui-text-muted);
}

.chat-md :deep(:not(pre) > code) {
  padding: 0.1em 0.3em;
  border-radius: 0.25rem;
  background: var(--ui-bg-accented);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em;
}

.chat-md :deep(.chat-md-table) {
  overflow-x: auto;
  max-width: 100%;
  margin: 0.5em 0;
  border: 1px solid var(--ui-border-accented);
  border-radius: 0.375rem;
}

.chat-md :deep(table) {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 0.85em;
}

.chat-md :deep(th),
.chat-md :deep(td) {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--ui-border-accented);
  text-align: left;
  white-space: nowrap;
}

.chat-md :deep(th) {
  background: var(--ui-bg-accented);
  font-weight: 600;
}
</style>
