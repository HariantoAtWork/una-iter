<script setup lang="ts">
import type {
  ModelStatusFilter,
  ProviderModelPublic,
  ProviderPublic,
} from '~/types/providers'
import { apiErrorMessage } from '~/utils/apiError'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  provider: ProviderPublic | null
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const toast = useToast()
const models = ref<ProviderModelPublic[]>([])
const loading = ref(false)
const fetching = ref(false)
const testing = ref(false)
const adding = ref(false)
const togglingId = ref<string | null>(null)
const search = ref('')
const statusFilter = ref<ModelStatusFilter>('all')
const bulkOpen = ref(false)
const bulkText = ref('')

const statusItems = [
  { label: 'All', value: 'all' as const },
  { label: 'Enabled', value: 'enabled' as const },
  { label: 'Disabled', value: 'disabled' as const },
]

const filteredModels = computed(() => {
  const query = search.value.trim().toLowerCase()
  return models.value.filter((model) => {
    if (statusFilter.value === 'enabled' && !model.enabled) {
      return false
    }
    if (statusFilter.value === 'disabled' && model.enabled) {
      return false
    }
    if (!query) {
      return true
    }
    return model.modelId.toLowerCase().includes(query)
  })
})

const counts = computed(() => ({
  all: models.value.length,
  enabled: models.value.filter(item => item.enabled).length,
  disabled: models.value.filter(item => !item.enabled).length,
}))

watch(
  () => [open.value, props.provider?.id] as const,
  async ([isOpen, providerId]) => {
    if (!isOpen || !providerId) {
      if (!isOpen) {
        models.value = []
        search.value = ''
        statusFilter.value = 'all'
        bulkOpen.value = false
        bulkText.value = ''
      }
      return
    }
    await loadModels()
  },
)

async function loadModels() {
  if (!props.provider) {
    return
  }
  loading.value = true
  try {
    const result = await $fetch<{ models: ProviderModelPublic[] }>(
      `/api/providers/${props.provider.id}/models`,
    )
    models.value = result.models
  }
  catch (err: unknown) {
    toast.add({
      title: 'Could not load models',
      description: apiErrorMessage(err),
      color: 'error',
    })
  }
  finally {
    loading.value = false
  }
}

async function fetchFromProvider() {
  if (!props.provider) {
    return
  }
  fetching.value = true
  try {
    const result = await $fetch<{
      models: ProviderModelPublic[]
      fetched: number
      added: number
      skippedExisting: number
    }>(`/api/providers/${props.provider.id}/models/fetch`, {
      method: 'POST',
    })
    models.value = result.models
    toast.add({
      title: 'Models retrieved',
      description: `Fetched ${result.fetched}, added ${result.added}, skipped ${result.skippedExisting} existing.`,
      color: 'success',
    })
    emit('refreshed')
  }
  catch (err: unknown) {
    toast.add({
      title: 'Could not retrieve models',
      description: apiErrorMessage(err),
      color: 'error',
    })
  }
  finally {
    fetching.value = false
  }
}

async function addBulk() {
  if (!props.provider) {
    return
  }
  adding.value = true
  try {
    const result = await $fetch<{
      models: ProviderModelPublic[]
      added: number
      skippedExisting: number
    }>(`/api/providers/${props.provider.id}/models`, {
      method: 'POST',
      body: { models: bulkText.value },
    })
    models.value = result.models
    bulkText.value = ''
    bulkOpen.value = false
    toast.add({
      title: 'Models added',
      description: `Added ${result.added}, skipped ${result.skippedExisting} existing.`,
      color: 'success',
    })
    emit('refreshed')
  }
  catch (err: unknown) {
    toast.add({
      title: 'Could not add models',
      description: apiErrorMessage(err),
      color: 'error',
    })
  }
  finally {
    adding.value = false
  }
}

async function testModels() {
  if (!props.provider) {
    return
  }
  testing.value = true
  try {
    const result = await $fetch<{
      models: ProviderModelPublic[]
      tested: number
      passed: number
      failed: number
      disabled: number
    }>(`/api/providers/${props.provider.id}/models/test`, {
      method: 'POST',
    })
    models.value = result.models
    toast.add({
      title: 'Model test finished',
      description: `Tested ${result.tested}: ${result.passed} passed, ${result.failed} failed, ${result.disabled} disabled.`,
      color: result.failed ? 'warning' : 'success',
    })
    emit('refreshed')
  }
  catch (err: unknown) {
    toast.add({
      title: 'Could not test models',
      description: apiErrorMessage(err),
      color: 'error',
    })
  }
  finally {
    testing.value = false
  }
}

async function toggleEnabled(model: ProviderModelPublic, enabled: boolean) {
  if (!props.provider) {
    return
  }
  const previous = model.enabled
  model.enabled = enabled
  togglingId.value = model.id
  try {
    await $fetch(`/api/providers/${props.provider.id}/models/${model.id}`, {
      method: 'PATCH',
      body: { enabled },
    })
    emit('refreshed')
  }
  catch (err: unknown) {
    model.enabled = previous
    toast.add({
      title: 'Could not update model',
      description: apiErrorMessage(err),
      color: 'error',
    })
  }
  finally {
    togglingId.value = null
  }
}
</script>

<template>
  <UDrawer
    v-model:open="open"
    direction="right"
    :handle="false"
    :title="provider ? `${provider.name} models` : 'Models'"
    :description="provider
      ? 'Admin catalogue only — not exposed on /api/v1/models.'
      : undefined"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <UButton
            label="Retrieve from /models"
            icon="i-lucide-cloud-download"
            size="sm"
            :loading="fetching"
            :disabled="loading || testing || adding"
            @click="fetchFromProvider"
          />
          <UButton
            label="Add in bulk"
            icon="i-lucide-list-plus"
            size="sm"
            color="neutral"
            variant="soft"
            :disabled="loading || fetching || testing"
            @click="bulkOpen = !bulkOpen"
          />
          <UButton
            label="Test models"
            icon="i-lucide-flask-conical"
            size="sm"
            color="neutral"
            variant="outline"
            :loading="testing"
            :disabled="loading || fetching || adding || !counts.enabled"
            @click="testModels"
          />
        </div>

        <div
          v-if="bulkOpen"
          class="space-y-2 rounded-md border border-default p-3"
        >
          <p class="text-sm text-muted">
            One model id per line. Duplicates are skipped.
          </p>
          <UTextarea
            v-model="bulkText"
            :rows="6"
            autoresize
            placeholder="gpt-4o&#10;claude-3-5-sonnet&#10;openai/gpt-4.1"
            class="w-full font-mono text-sm"
          />
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="adding"
              @click="bulkOpen = false"
            />
            <UButton
              label="Add models"
              size="sm"
              :loading="adding"
              :disabled="!bulkText.trim()"
              @click="addBulk"
            />
          </div>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search models…"
            class="w-full"
            size="sm"
          />
          <UTabs
            v-model="statusFilter"
            :items="statusItems"
            :content="false"
            size="sm"
            color="neutral"
            class="shrink-0"
          />
        </div>

        <p class="text-xs text-muted">
          Showing {{ filteredModels.length }} of {{ counts.all }}
          ({{ counts.enabled }} enabled · {{ counts.disabled }} disabled)
        </p>

        <div
          v-if="loading"
          class="text-sm text-muted"
        >
          Loading models…
        </div>

        <ul
          v-else-if="filteredModels.length"
          class="max-h-[60vh] overflow-y-auto rounded-md border border-default divide-y divide-default"
        >
          <li
            v-for="model in filteredModels"
            :key="model.id"
            class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
          >
            <div class="min-w-0">
              <p class="font-mono text-highlighted truncate">
                {{ model.modelId }}
              </p>
              <p class="text-xs text-muted">
                {{ model.source }}
                <template v-if="model.lastTestOk !== null">
                  · last test {{ model.lastTestOk ? 'ok' : 'failed' }}
                </template>
              </p>
            </div>
            <USwitch
              :model-value="model.enabled"
              :loading="togglingId === model.id"
              size="sm"
              aria-label="Toggle model enabled"
              @update:model-value="(value: boolean) => toggleEnabled(model, value)"
            />
          </li>
        </ul>

        <p
          v-else
          class="text-sm text-muted"
        >
          {{ counts.all ? 'No models match this filter.' : 'No models yet. Retrieve from the provider or add in bulk.' }}
        </p>
      </div>
    </template>
  </UDrawer>
</template>
