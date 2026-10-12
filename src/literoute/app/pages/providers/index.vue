<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

type ProviderPublic = {
  id: string
  name: string
  slug: string
  baseUrl: string
  keyCount: number
  validKeyCount: number
  keys: Array<{
    id: string
    hint: string
    valid: boolean | null
    createdAt: string
  }>
}

type FormState = {
  name: string
  slug: string
  baseUrl: string
  keys: string
  validateKeys: boolean
}

type ModalMode = 'create' | 'edit'

const toast = useToast()
const confirm = useConfirmDialog()
const slugTouched = ref(false)
const pending = ref(false)
const deleting = ref(false)
const open = ref(false)
const mode = ref<ModalMode>('create')
const editingId = ref<string | null>(null)

const state = reactive<FormState>({
  name: '',
  slug: '',
  baseUrl: '',
  keys: '',
  validateKeys: true,
})

const { data, refresh } = await useFetch<{ providers: ProviderPublic[] }>('/api/providers')

const isEmpty = computed(() => !data.value?.providers?.length)
const editingProvider = computed(() =>
  data.value?.providers?.find(provider => provider.id === editingId.value) || null,
)
const modalTitle = computed(() => mode.value === 'create' ? 'Add provider' : 'Edit provider')
const modalDescription = computed(() =>
  mode.value === 'create'
    ? 'OpenAI-compatible endpoint with bulk API keys.'
    : 'Update provider details. Optionally append more keys.',
)

useHead({ title: 'Providers · Literoute' })

if (isEmpty.value) {
  openCreate()
}

function toSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

watch(() => state.name, (name) => {
  if (!slugTouched.value) {
    state.slug = toSlug(name)
  }
})

function resetForm() {
  state.name = ''
  state.slug = ''
  state.baseUrl = ''
  state.keys = ''
  state.validateKeys = true
  slugTouched.value = false
  mode.value = 'create'
  editingId.value = null
}

function openCreate() {
  resetForm()
  mode.value = 'create'
  open.value = true
}

function openEdit(provider: ProviderPublic) {
  mode.value = 'edit'
  editingId.value = provider.id
  state.name = provider.name
  state.slug = provider.slug
  state.baseUrl = provider.baseUrl
  state.keys = ''
  state.validateKeys = false
  slugTouched.value = true
  open.value = true
}

function onModalOpenChange(value: boolean) {
  if (!value) {
    resetForm()
  }
}

function errorMessage(err: unknown) {
  return (err as { data?: { statusMessage?: string }, statusMessage?: string })
    ?.data
    ?.statusMessage
    || (err as { statusMessage?: string })?.statusMessage
    || 'Something went wrong'
}

async function onSubmit(_event: FormSubmitEvent<FormState>) {
  pending.value = true
  try {
    if (mode.value === 'create') {
      const result = await $fetch<{
        acceptedKeyCount: number
        skippedExisting: number
        skippedInvalid: number
      }>('/api/providers', {
        method: 'POST',
        body: {
          name: state.name,
          slug: state.slug,
          baseUrl: state.baseUrl,
          keys: state.keys,
          validateKeys: state.validateKeys,
        },
      })

      const parts = [`Saved ${result.acceptedKeyCount} key(s)`]
      if (result.skippedExisting) {
        parts.push(`skipped ${result.skippedExisting} existing`)
      }
      if (result.skippedInvalid) {
        parts.push(`skipped ${result.skippedInvalid} invalid`)
      }

      toast.add({
        title: 'Provider added',
        description: `${parts.join(', ')}.`,
        color: 'success',
      })
    }
    else if (editingId.value) {
      const result = await $fetch<{
        acceptedKeyCount: number
        skippedExisting: number
        skippedInvalid: number
      }>(`/api/providers/${editingId.value}`, {
        method: 'PATCH',
        body: {
          name: state.name,
          slug: state.slug,
          baseUrl: state.baseUrl,
          keys: state.keys,
          validateKeys: state.validateKeys,
        },
      })

      const parts = ['Provider updated']
      if (result.acceptedKeyCount) {
        parts.push(`added ${result.acceptedKeyCount} key(s)`)
      }
      if (result.skippedExisting) {
        parts.push(`skipped ${result.skippedExisting} existing`)
      }
      if (result.skippedInvalid) {
        parts.push(`skipped ${result.skippedInvalid} invalid`)
      }

      toast.add({
        title: 'Provider saved',
        description: `${parts.join(', ')}.`,
        color: 'success',
      })
    }

    open.value = false
    resetForm()
    await refresh()
  }
  catch (err: unknown) {
    toast.add({
      title: mode.value === 'create' ? 'Could not add provider' : 'Could not update provider',
      description: errorMessage(err),
      color: 'error',
    })
  }
  finally {
    pending.value = false
  }
}

async function confirmDeleteProvider(provider: ProviderPublic) {
  const ok = await confirm({
    title: 'Delete provider?',
    description: `Remove “${provider.name}” and all of its API keys. This cannot be undone.`,
    confirmLabel: 'Delete',
    confirmColor: 'error',
  })
  if (!ok) {
    return
  }

  deleting.value = true
  try {
    await $fetch(`/api/providers/${provider.id}`, { method: 'DELETE' })
    toast.add({ title: 'Provider deleted', color: 'success' })
    if (editingId.value === provider.id) {
      open.value = false
      resetForm()
    }
    await refresh()
  }
  catch (err: unknown) {
    toast.add({
      title: 'Could not delete provider',
      description: errorMessage(err),
      color: 'error',
    })
  }
  finally {
    deleting.value = false
  }
}

async function removeKey(provider: ProviderPublic, keyId: string) {
  const ok = await confirm({
    title: 'Remove API key?',
    description: 'This key will be removed from the provider. This cannot be undone.',
    confirmLabel: 'Remove',
    confirmColor: 'error',
  })
  if (!ok) {
    return
  }

  try {
    await $fetch(`/api/providers/${provider.id}/keys/${keyId}`, { method: 'DELETE' })
    toast.add({ title: 'API key removed', color: 'success' })
    await refresh()
  }
  catch (err: unknown) {
    toast.add({
      title: 'Could not remove key',
      description: errorMessage(err),
      color: 'error',
    })
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Providers">
        <template #leading>
          <UDashboardSidebarToggle />
        </template>
        <template #right>
          <UButton
            label="Add provider"
            icon="i-lucide-plus"
            @click="openCreate"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6 max-w-3xl">
        <div>
          <h1 class="text-xl font-semibold text-highlighted">
            Providers
          </h1>
          <p class="text-sm text-muted mt-1">
            Create, edit, and delete OpenAI-compatible providers and their keys.
          </p>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold text-highlighted">
                Saved providers
              </h2>
              <UButton
                v-if="isEmpty"
                label="Add provider"
                icon="i-lucide-plus"
                size="sm"
                variant="soft"
                @click="openCreate"
              />
            </div>
          </template>

          <div
            v-if="isEmpty"
            class="text-sm text-muted"
          >
            No providers yet. Add one to get started, or close the dialog to browse this empty list.
          </div>

          <ul
            v-else
            class="divide-y divide-default"
          >
            <li
              v-for="provider in data?.providers"
              :key="provider.id"
              class="py-4 space-y-3"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="font-medium text-highlighted">
                    {{ provider.name }}
                  </p>
                  <p class="text-sm text-muted">
                    {{ provider.slug }} · {{ provider.baseUrl }}
                  </p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <UBadge
                    color="neutral"
                    variant="subtle"
                  >
                    {{ provider.keyCount }} keys
                  </UBadge>
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    aria-label="Edit provider"
                    @click="openEdit(provider)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="sm"
                    aria-label="Delete provider"
                    :loading="deleting"
                    @click="confirmDeleteProvider(provider)"
                  />
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="key in provider.keys"
                  :key="key.id"
                  :color="key.valid === true ? 'success' : key.valid === false ? 'error' : 'neutral'"
                  variant="subtle"
                  class="gap-1"
                >
                  <span>{{ key.hint }}</span>
                  <button
                    type="button"
                    class="ms-1 opacity-70 hover:opacity-100"
                    :aria-label="`Remove key ${key.hint}`"
                    @click="removeKey(provider, key.id)"
                  >
                    <UIcon
                      name="i-lucide-x"
                      class="size-3"
                    />
                  </button>
                </UBadge>
              </div>
            </li>
          </ul>
        </UCard>
      </div>

      <UModal
        v-model:open="open"
        :title="modalTitle"
        :description="modalDescription"
        :ui="{ content: 'sm:max-w-xl' }"
        @update:open="onModalOpenChange"
      >
        <template #body>
          <UForm
            id="provider-form"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField
              label="Name"
              name="name"
              required
            >
              <UInput
                v-model="state.name"
                placeholder="OpenRouter"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField
              label="Slug"
              name="slug"
              hint="Auto-generated from name; editable"
              required
            >
              <UInput
                :model-value="state.slug"
                placeholder="openrouter"
                class="w-full"
                required
                @update:model-value="(value) => { slugTouched = true; state.slug = toSlug(String(value ?? '')) }"
              />
            </UFormField>

            <UFormField
              label="Base URL"
              name="baseUrl"
              hint="OpenAI-compatible root, e.g. https://api.openai.com/v1"
              required
            >
              <UInput
                v-model="state.baseUrl"
                type="url"
                placeholder="https://api.openai.com/v1"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField
              :label="mode === 'create' ? 'Bulk keys' : 'Add more keys'"
              name="keys"
              :hint="mode === 'create'
                ? 'One key per line. Optional id: id|key (uuid v7 when omitted)'
                : 'Optional. Appends keys; duplicates are skipped.'"
              :required="mode === 'create'"
            >
              <UTextarea
                v-model="state.keys"
                :rows="mode === 'create' ? 8 : 5"
                autoresize
                placeholder="sk-key-here&#10;my-id|sk-key-something&#10;cursor@harianto.dev|another-key"
                class="w-full font-mono text-sm"
                :required="mode === 'create'"
              />
            </UFormField>

            <UCheckbox
              v-model="state.validateKeys"
              label="Auto-check keys and add only valid keys"
              description="Calls GET {baseUrl}/models with each key before saving."
            />

            <div
              v-if="mode === 'edit' && editingProvider?.keys?.length"
              class="space-y-2"
            >
              <p class="text-sm font-medium text-highlighted">
                Existing keys
              </p>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="key in editingProvider.keys"
                  :key="key.id"
                  :color="key.valid === true ? 'success' : key.valid === false ? 'error' : 'neutral'"
                  variant="subtle"
                  class="gap-1"
                >
                  <span>{{ key.id }} · {{ key.hint }}</span>
                  <button
                    type="button"
                    class="ms-1 opacity-70 hover:opacity-100"
                    :aria-label="`Remove key ${key.hint}`"
                    @click="removeKey(editingProvider, key.id)"
                  >
                    <UIcon
                      name="i-lucide-x"
                      class="size-3"
                    />
                  </button>
                </UBadge>
              </div>
            </div>
          </UForm>
        </template>

        <template #footer="{ close }">
          <div class="flex justify-end gap-2 w-full">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              :disabled="pending"
              @click="close()"
            />
            <UButton
              type="submit"
              form="provider-form"
              :label="mode === 'create' ? 'Submit' : 'Save'"
              :icon="mode === 'create' ? 'i-lucide-plus' : 'i-lucide-check'"
              :loading="pending"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
