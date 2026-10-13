<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ProviderKeyMethod, ProviderPublic } from '~/types/providers'
import { PROVIDER_KEY_METHOD_OPTIONS } from '~/types/providers'
import { apiErrorMessage } from '~/utils/apiError'

type FormState = {
  name: string
  slug: string
  baseUrl: string
  keyMethod: ProviderKeyMethod
  keys: string
  validateKeys: boolean
}

type ModalMode = 'create' | 'edit'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  mode: ModalMode
  editingProvider: ProviderPublic | null
}>()

const emit = defineEmits<{
  saved: []
  'remove-key': [provider: ProviderPublic, keyId: string]
}>()

const toast = useToast()
const slugTouched = ref(false)
const pending = ref(false)

const state = reactive<FormState>({
  name: '',
  slug: '',
  baseUrl: '',
  keyMethod: 'roundabout',
  keys: '',
  validateKeys: true,
})

const keyMethodItems = PROVIDER_KEY_METHOD_OPTIONS.map(option => ({
  label: option.label,
  value: option.value,
  description: option.description,
}))

const modalTitle = computed(() => props.mode === 'create' ? 'Add provider' : 'Edit provider')
const modalDescription = computed(() =>
  props.mode === 'create'
    ? 'OpenAI-compatible endpoint. API keys are optional for local servers.'
    : 'Update provider details. Optionally append more keys.',
)

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

watch(open, (isOpen) => {
  if (!isOpen) {
    resetForm()
    return
  }

  if (props.mode === 'edit' && props.editingProvider) {
    state.name = props.editingProvider.name
    state.slug = props.editingProvider.slug
    state.baseUrl = props.editingProvider.baseUrl
    state.keyMethod = props.editingProvider.keyMethod || 'roundabout'
    state.keys = ''
    state.validateKeys = false
    slugTouched.value = true
  }
})

function resetForm() {
  state.name = ''
  state.slug = ''
  state.baseUrl = ''
  state.keyMethod = 'roundabout'
  state.keys = ''
  state.validateKeys = true
  slugTouched.value = false
}

async function onSubmit(_event: FormSubmitEvent<FormState>) {
  pending.value = true
  try {
    if (props.mode === 'create') {
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

      const parts = result.acceptedKeyCount
        ? [`Saved ${result.acceptedKeyCount} key(s)`]
        : ['No API keys (optional for local AI)']
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
    else if (props.editingProvider) {
      const result = await $fetch<{
        acceptedKeyCount: number
        skippedExisting: number
        skippedInvalid: number
      }>(`/api/providers/${props.editingProvider.id}`, {
        method: 'PATCH',
        body: {
          name: state.name,
          slug: state.slug,
          baseUrl: state.baseUrl,
          keyMethod: state.keyMethod,
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
    emit('saved')
  }
  catch (err: unknown) {
    toast.add({
      title: props.mode === 'create' ? 'Could not add provider' : 'Could not update provider',
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
    :title="modalTitle"
    :description="modalDescription"
    :ui="{ content: 'sm:max-w-xl' }"
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
          v-if="mode === 'edit'"
          label="Key list method"
          name="keyMethod"
          hint="Controls how the key list behaves when a key is exhausted."
          required
        >
          <USelect
            v-model="state.keyMethod"
            :items="keyMethodItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="mode === 'create' ? 'Bulk keys' : 'Add more keys'"
          name="keys"
          :hint="mode === 'create'
            ? 'Optional. One key per line; id|key when needed. Leave empty for local AI without an API key.'
            : 'Optional. Appends keys; duplicates are skipped.'"
        >
          <UTextarea
            v-model="state.keys"
            :rows="mode === 'create' ? 8 : 5"
            autoresize
            placeholder="sk-key-here&#10;my-id|sk-key-something&#10;cursor@harianto.dev|another-key"
            class="w-full font-mono text-sm"
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
                @click="emit('remove-key', editingProvider, key.id)"
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
