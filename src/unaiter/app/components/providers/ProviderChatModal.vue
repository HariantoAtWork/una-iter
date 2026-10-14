<script setup lang="ts">
import type { ModelStatusFilter, ProviderModelPublic, ProviderPublic } from '~/types/providers'
import { apiErrorMessage } from '~/utils/apiError'

type ChatRole = 'user' | 'assistant' | 'system'

type ChatMessage = {
  role: ChatRole
  content: string
  /** Chain-of-thought streamed separately from the answer, when the model emits it. */
  reasoning?: string
  /** Whether the reasoning block is expanded. */
  showReasoning?: boolean
}

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  provider: ProviderPublic | null
}>()

const models = ref<ProviderModelPublic[]>([])
const loadingModels = ref(false)
const selectedModel = ref<string | null>(null)
const statusFilter = ref<ModelStatusFilter>('all')
const messages = ref<ChatMessage[]>([])
const prompt = ref('')
const sending = ref(false)

const toast = useToast()
const controller = ref<AbortController | null>(null)
const scrollRef = ref<HTMLElement | null>(null)

const statusItems = [
  { label: 'All', value: 'all' as const },
  { label: 'Enabled', value: 'enabled' as const },
  { label: 'Disabled', value: 'disabled' as const },
]

const filteredModels = computed(() =>
  models.value.filter((model) => {
    if (statusFilter.value === 'enabled') {
      return model.enabled
    }
    if (statusFilter.value === 'disabled') {
      return !model.enabled
    }
    return true
  }),
)

const modelItems = computed(() =>
  filteredModels.value.map(model => ({
    label: model.modelId,
    value: model.modelId,
  })),
)

const hasModels = computed(() => models.value.length > 0)
const canSend = computed(() =>
  !!selectedModel.value && !!prompt.value.trim() && !sending.value,
)

/** Only the last assistant message is ever mid-stream; render Markdown once done. */
function isStreamingMessage(index: number) {
  return sending.value
    && messages.value.at(-1)?.role === 'assistant'
    && index === messages.value.length - 1
}watch(
  () => [open.value, props.provider?.id] as const,
  async ([isOpen, providerId]) => {
    if (!isOpen) {
      abort()
      messages.value = []
      prompt.value = ''
      models.value = []
      selectedModel.value = null
      statusFilter.value = 'all'
      return
    }
    if (providerId) {
      await loadModels(providerId)
    }
  },
  { immediate: true },
)

watch(
  () => messages.value.length,
  () => scrollToBottom(),
)

// When the filter hides the current selection, move to the first visible model.
watch(statusFilter, () => {
  const visible = filteredModels.value
  if (visible.some(model => model.modelId === selectedModel.value)) {
    return
  }
  const first = visible[0]
  selectedModel.value = first ? first.modelId : null
})

async function loadModels(providerId: string) {
  loadingModels.value = true
  selectedModel.value = null
  statusFilter.value = 'all'
  models.value = []
  try {
    const result = await $fetch<{ models: ProviderModelPublic[] }>(
      `/api/providers/${providerId}/models`,
    )
    // Enabled models first so the auto-select lands on a usable model.
    const sorted = [...result.models].sort((a, b) => Number(b.enabled) - Number(a.enabled))
    models.value = sorted
    statusFilter.value = sorted.some(model => model.enabled) ? 'enabled' : 'all'
    const first = sorted[0]
    if (first) {
      selectedModel.value = first.modelId
    }
  }
  catch (err: unknown) {
    toast.add({
      title: 'Could not load models',
      description: apiErrorMessage(err),
      color: 'error',
    })
  }
  finally {
    loadingModels.value = false
  }
}

function publicModelId() {
  return props.provider && selectedModel.value
    ? `${props.provider.slug}/${selectedModel.value}`
    : null
}

async function scrollToBottom() {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
}

function abort() {
  controller.value?.abort()
  controller.value = null
  sending.value = false
}

async function send() {
  const model = publicModelId()
  const text = prompt.value.trim()
  if (!model || !text || sending.value) {
    return
  }

  messages.value.push({ role: 'user', content: text })
  prompt.value = ''
  sending.value = true

  const assistant: ChatMessage = { role: 'assistant', content: '' }
  messages.value.push(assistant)

  const payload = messages.value
    .filter(message => message.content.trim().length > 0)
    .map(message => ({ role: message.role, content: message.content }))

  controller.value = new AbortController()
  try {
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: payload, stream: true }),
      signal: controller.value.signal,
    })

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '')
      throw new Error(detail || `Request failed (${response.status})`)
    }

    await readStream(response.body, assistant)
  }
  catch (err: unknown) {
    if ((err as Error)?.name !== 'AbortError') {
      toast.add({
        title: 'Chat request failed',
        description: err instanceof Error ? err.message : apiErrorMessage(err),
        color: 'error',
      })
      if (!assistant.content) {
        messages.value = messages.value.filter(message => message !== assistant)
      }
    }
  }
  finally {
    sending.value = false
    controller.value = null
    void scrollToBottom()
  }
}

async function readStream(body: ReadableStream<Uint8Array>, target: ChatMessage) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // Mutate through the reactive proxy so streaming updates render live.
  const live = messages.value[messages.value.indexOf(target)]

  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })

    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      for (const line of event.split('\n')) {
        const data = line.startsWith('data:') ? line.slice(5).trim() : ''
        if (!data || data === '[DONE]') {
          continue
        }
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{
              delta?: { content?: string, reasoning_content?: string, reasoning?: string }
              message?: { content?: string, reasoning_content?: string }
            }>
          }
          const delta = parsed.choices?.[0]?.delta
          const message = parsed.choices?.[0]?.message
          const chunk = delta?.content ?? message?.content
          const reasoning = delta?.reasoning_content ?? delta?.reasoning ?? message?.reasoning_content
          if (reasoning) {
            live.reasoning = (live.reasoning ?? '') + reasoning
            // Reveal the chain-of-thought while it streams; still user-collapsible.
            if (live.showReasoning === undefined) {
              live.showReasoning = true
            }
            void scrollToBottom()
          }
          if (chunk) {
            live.content += chunk
            void scrollToBottom()
          }
        }
        catch {
          // Ignore keep-alive or non-JSON frames.
        }
      }
    }
  }
}

function stop() {
  abort()
}

function clearChat() {
  abort()
  messages.value = []
}

function toggleReasoning(message: ChatMessage) {
  message.showReasoning = !message.showReasoning
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="provider ? `Chat with ${provider.name}` : 'Chat'"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <div
          v-if="loadingModels"
          class="text-sm text-muted"
        >
          Loading models…
        </div>

        <p
          v-else-if="!hasModels"
          class="text-sm text-muted"
        >
          No models available for this provider. Add or enable models first.
        </p>

        <UTabs
          v-if="hasModels"
          v-model="statusFilter"
          :items="statusItems"
          :content="false"
          size="sm"
          color="neutral"
          :ui="{ root: 'w-full', list: 'w-full', trigger: 'flex-1 justify-center' }"
        />

        <USelect
          v-if="hasModels"
          v-model="selectedModel"
          :items="modelItems"
          value-key="value"
          label-key="label"
          placeholder="Select a model"
          :disabled="sending"
          class="w-full"
        />

        <div
          ref="scrollRef"
          class="flex flex-col gap-3 overflow-y-auto rounded-md border border-default p-3 min-h-40 max-h-[45vh]"
        >
          <p
            v-if="!messages.length"
            class="text-sm text-muted"
          >
            No messages yet. Pick a model and ask something.
          </p>

          <div
            v-for="(message, index) in messages"
            :key="index"
            class="flex"
            :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[85%] rounded-lg px-3 py-2 text-sm"
              :class="message.role === 'user'
                ? 'bg-primary/10 text-highlighted whitespace-pre-wrap break-words'
                : 'bg-elevated text-default'"
            >
              <!-- Chain-of-thought: only rendered when the model actually emits
                   it, and always toggleable. -->
              <div
                v-if="message.role === 'assistant' && message.reasoning"
                class="mb-2 border-l-2 border-default pl-2"
              >
                <button
                  type="button"
                  class="flex items-center gap-1 text-xs text-muted hover:text-default"
                  @click="toggleReasoning(message)"
                >
                  <UIcon
                    :name="message.showReasoning ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                    class="size-3.5"
                  />
                  <span>{{ isStreamingMessage(index) && !message.content ? 'Thinking…' : 'Reasoning' }}</span>
                </button>
                <div
                  v-if="message.showReasoning"
                  class="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-xs text-muted"
                >
                  {{ message.reasoning }}
                </div>
              </div>

              <!-- Assistant replies render as Markdown (streaming replies stay
                   plain text inside the component until they finish). -->
              <ProvidersProviderChatMarkdown
                v-if="message.role === 'assistant'"
                :content="message.content"
                :streaming="isStreamingMessage(index)"
              />
              <span v-else>{{ message.content }}</span>
            </div>
          </div>
        </div>

        <UTextarea
          v-model="prompt"
          :rows="3"
          autoresize
          :disabled="sending || !hasModels"
          placeholder="Type a message…"
          class="w-full"
          @keydown.enter.exact.prevent="send"
        />
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex items-center justify-between gap-2 w-full">
        <UButton
          label="Clear"
          color="neutral"
          variant="ghost"
          icon="i-lucide-eraser"
          :disabled="!messages.length || sending"
          @click="clearChat"
        />
        <div class="flex items-center gap-2">
          <UButton
            label="Close"
            color="neutral"
            variant="ghost"
            @click="close()"
          />
          <UButton
            v-if="sending"
            label="Stop"
            color="error"
            variant="soft"
            icon="i-lucide-square"
            @click="stop"
          />
          <UButton
            v-else
            label="Send"
            icon="i-lucide-send"
            :disabled="!canSend"
            @click="send"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
