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

const toast = useToast()
const slugTouched = ref(false)
const pending = ref(false)

const state = reactive<FormState>({
  name: '',
  slug: '',
  baseUrl: '',
  keys: '',
  validateKeys: true,
})

const { data, refresh } = await useFetch<{ providers: ProviderPublic[] }>('/api/providers')

useHead({ title: 'Providers · Literoute' })

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

async function onSubmit(_event: FormSubmitEvent<FormState>) {
  pending.value = true
  try {
    const result = await $fetch<{
      provider: ProviderPublic
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

    state.name = ''
    state.slug = ''
    state.baseUrl = ''
    state.keys = ''
    state.validateKeys = true
    slugTouched.value = false
    await refresh()
  }
  catch (err: unknown) {
    const statusMessage = (err as { data?: { statusMessage?: string }, statusMessage?: string })
      ?.data
      ?.statusMessage
      || (err as { statusMessage?: string })?.statusMessage
    toast.add({
      title: 'Could not add provider',
      description: statusMessage || 'Please check the form and try again.',
      color: 'error',
    })
  }
  finally {
    pending.value = false
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
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-8 max-w-3xl">
        <div>
          <h1 class="text-xl font-semibold text-highlighted">
            Providers
          </h1>
          <p class="text-sm text-muted mt-1">
            Add OpenAI-compatible providers and bulk-import API keys.
          </p>
        </div>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              Add provider
            </h2>
          </template>

          <UForm
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
              label="Bulk keys"
              name="keys"
              hint="One key per line. Optional id: id|key (uuid v7 generated when omitted)"
              required
            >
              <UTextarea
                v-model="state.keys"
                :rows="8"
                autoresize
                placeholder="sk-key-here&#10;my-id|sk-key-something&#10;cursor@harianto.dev|another-key"
                class="w-full font-mono text-sm"
                required
              />
            </UFormField>

            <UCheckbox
              v-model="state.validateKeys"
              label="Auto-check keys and add only valid keys"
              description="Calls GET {baseUrl}/models with each key before saving."
            />

            <div class="flex justify-end pt-2">
              <UButton
                type="submit"
                label="Submit"
                icon="i-lucide-plus"
                :loading="pending"
              />
            </div>
          </UForm>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              Saved providers
            </h2>
          </template>

          <div
            v-if="!data?.providers?.length"
            class="text-sm text-muted"
          >
            No providers saved yet.
          </div>

          <ul
            v-else
            class="divide-y divide-default"
          >
            <li
              v-for="provider in data.providers"
              :key="provider.id"
              class="py-4 space-y-2"
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
                <UBadge
                  color="neutral"
                  variant="subtle"
                >
                  {{ provider.keyCount }} keys
                </UBadge>
              </div>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="key in provider.keys"
                  :key="key.id"
                  :color="key.valid === true ? 'success' : key.valid === false ? 'error' : 'neutral'"
                  variant="subtle"
                >
                  {{ key.hint }}
                </UBadge>
              </div>
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
