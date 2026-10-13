<script setup lang="ts">
import { apiErrorMessage } from '~/utils/apiError'

type ImportProvider = {
  name: string
  slug: string
  baseUrl: string
  keyMethod?: string
  keys?: unknown[]
  models?: unknown[]
}

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  items: ImportProvider[]
}>()

const emit = defineEmits<{
  done: []
}>()

const toast = useToast()
const pending = ref(false)

const selected = ref<Set<number>>(new Set())

function keyCount(item: ImportProvider) {
  return Array.isArray(item.keys) ? item.keys.length : 0
}

function modelCount(item: ImportProvider) {
  return Array.isArray(item.models) ? item.models.length : 0
}

watch(open, (isOpen) => {
  if (isOpen) {
    selected.value = new Set(props.items.map((_, index) => index))
    pending.value = false
  }
})

const allSelected = computed({
  get: () => props.items.length > 0 && selected.value.size === props.items.length,
  set: (value: boolean) => {
    selected.value = value ? new Set(props.items.map((_, index) => index)) : new Set()
  },
})

function toggleItem(index: number) {
  const next = new Set(selected.value)
  if (next.has(index)) {
    next.delete(index)
  }
  else {
    next.add(index)
  }
  selected.value = next
}

async function submit(overwrite: boolean) {
  const providers = props.items.filter((_, index) => selected.value.has(index))
  if (!providers.length) {
    return
  }

  pending.value = true
  try {
    const result = await $fetch<{
      imported: number
      overwritten: number
      skipped: number
    }>('/api/providers/import.commit', {
      method: 'POST',
      body: { providers, overwrite },
    })

    const parts = [
      `added ${result.imported}`,
      ...(result.overwritten ? [`overwritten ${result.overwritten}`] : []),
      ...(result.skipped ? [`skipped ${result.skipped} existing`] : []),
    ]

    toast.add({
      title: 'Import complete',
      description: `${parts.join(', ')}.`,
      color: 'success',
    })

    open.value = false
    emit('done')
  }
  catch (err: unknown) {
    toast.add({
      title: 'Import failed',
      description: apiErrorMessage(err),
      color: 'error',
    })
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Import providers"
    description="Choose which providers to import. Deselect any you do not want."
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <UCheckbox
            v-model="allSelected"
            label="Select all"
          />
          <span class="text-sm text-muted">
            {{ selected.size }} of {{ items.length }} selected
          </span>
        </div>

        <fieldset class="space-y-2 max-h-80 overflow-y-auto">
          <label
            v-for="(item, index) in items"
            :key="`${item.slug}-${index}`"
            class="flex items-start gap-3 rounded-lg border border-default p-3 cursor-pointer hover:bg-elevated/50"
          >
            <input
              type="checkbox"
              class="mt-0.5 size-4 accent-primary"
              :checked="selected.has(index)"
              @change="toggleItem(index)"
            >
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2 flex-wrap">
                <span class="font-medium text-highlighted">{{ item.name }}</span>
                <UBadge
                  color="neutral"
                  variant="subtle"
                >
                  {{ item.slug }}
                </UBadge>
              </span>
              <span class="block truncate text-sm text-muted">
                {{ item.baseUrl }}
              </span>
              <span class="text-xs text-muted">
                {{ keyCount(item) }} key(s) · {{ modelCount(item) }} model(s)
              </span>
            </span>
          </label>
        </fieldset>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex flex-wrap items-center justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :disabled="pending"
          @click="close()"
        />
        <UButton
          label="Overwrite"
          color="warning"
          variant="soft"
          icon="i-lucide-refresh-cw"
          :loading="pending"
          :disabled="!selected.size"
          title="Replace matching providers instead of skipping them"
          @click="submit(true)"
        />
        <UButton
          label="Import"
          icon="i-lucide-download"
          :loading="pending"
          :disabled="!selected.size"
          @click="submit(false)"
        />
      </div>
    </template>
  </UModal>
</template>
