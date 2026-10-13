<script setup lang="ts">
import type { ProviderKeyPublic, ProviderPublic } from '~/types/providers'
import { providerKeyMethodLabel } from '~/types/providers'
import { apiErrorMessage } from '~/utils/apiError'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  provider: ProviderPublic | null
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const toast = useToast()
const movingKeyId = ref<string | null>(null)
const localKeys = ref<ProviderKeyPublic[]>([])
const dragFromIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const drawerDescription = computed(() => {
  if (!props.provider) {
    return undefined
  }
  return `${providerKeyMethodLabel(props.provider.keyMethod)} · ${props.provider.baseUrl}`
})

watch(
  () => props.provider?.keys,
  (keys) => {
    if (dragFromIndex.value !== null) {
      return
    }
    localKeys.value = keys ? keys.map(key => ({ ...key })) : []
  },
  { immediate: true, deep: true },
)

async function persistMove(keyId: string, body: { direction?: 'up' | 'down', toIndex?: number }) {
  if (!props.provider) {
    return
  }

  movingKeyId.value = keyId
  try {
    const result = await $fetch<{ provider: ProviderPublic }>(
      `/api/providers/${props.provider.id}/keys/${keyId}/move`,
      {
        method: 'PATCH',
        body,
      },
    )
    localKeys.value = result.provider.keys.map(key => ({ ...key }))
    emit('refreshed')
  }
  catch (err: unknown) {
    localKeys.value = props.provider.keys.map(key => ({ ...key }))
    toast.add({
      title: 'Could not reorder key',
      description: apiErrorMessage(err),
      color: 'error',
    })
  }
  finally {
    movingKeyId.value = null
  }
}

async function moveKey(keyId: string, direction: 'up' | 'down') {
  await persistMove(keyId, { direction })
}

function onDragStart(index: number, event: DragEvent) {
  if (movingKeyId.value) {
    event.preventDefault()
    return
  }
  dragFromIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

function onDragLeave(index: number) {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null
  }
}

async function onDrop(toIndex: number, event: DragEvent) {
  event.preventDefault()
  const fromIndex = dragFromIndex.value
  dragFromIndex.value = null
  dragOverIndex.value = null

  if (fromIndex === null || fromIndex === toIndex || !props.provider) {
    return
  }

  const next = [...localKeys.value]
  const [item] = next.splice(fromIndex, 1)
  if (!item) {
    return
  }
  next.splice(toIndex, 0, item)
  localKeys.value = next
  await persistMove(item.id, { toIndex })
}

function onDragEnd() {
  dragFromIndex.value = null
  dragOverIndex.value = null
}
</script>

<template>
  <UDrawer
    v-model:open="open"
    direction="right"
    :handle="false"
    :title="provider ? `${provider.name} keys` : 'API keys'"
    :description="drawerDescription"
  >
    <template #body>
      <ul
        v-if="localKeys.length"
        class="rounded-md border border-default divide-y divide-default"
      >
        <li
          v-for="(key, index) in localKeys"
          :key="key.id"
          draggable="true"
          class="flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-grab active:cursor-grabbing"
          :class="{
            'bg-elevated/60': dragOverIndex === index && dragFromIndex !== index,
            'opacity-50': dragFromIndex === index,
          }"
          @dragstart="onDragStart(index, $event)"
          @dragover="onDragOver(index, $event)"
          @dragleave="onDragLeave(index)"
          @drop="onDrop(index, $event)"
          @dragend="onDragEnd"
        >
          <div class="flex items-center gap-2 min-w-0">
            <UIcon
              name="i-lucide-grip-vertical"
              class="size-4 shrink-0 text-muted"
              aria-hidden="true"
            />
            <div class="min-w-0 font-mono truncate">
              <span class="text-highlighted">{{ key.id }}</span>
              <span class="text-muted"> · {{ key.hint }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <UBadge
              :color="key.valid === true ? 'success' : key.valid === false ? 'error' : 'neutral'"
              variant="subtle"
            >
              {{ key.valid === true ? 'Valid' : key.valid === false ? 'Invalid' : 'Unchecked' }}
            </UBadge>
            <UButton
              icon="i-lucide-chevron-up"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Move key up"
              :disabled="index === 0 || Boolean(movingKeyId)"
              :loading="movingKeyId === key.id"
              @click="moveKey(key.id, 'up')"
            />
            <UButton
              icon="i-lucide-chevron-down"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Move key down"
              :disabled="index === localKeys.length - 1 || Boolean(movingKeyId)"
              :loading="movingKeyId === key.id"
              @click="moveKey(key.id, 'down')"
            />
          </div>
        </li>
      </ul>
      <p
        v-else
        class="text-sm text-muted"
      >
        No API keys.
      </p>
    </template>
  </UDrawer>
</template>
