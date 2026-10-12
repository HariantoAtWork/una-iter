<script setup lang="ts">
import type { ProviderPublic } from '~/types/providers'
import { providerKeyMethodLabel } from '~/types/providers'
import { apiErrorMessage } from '~/utils/apiError'

type ModalMode = 'create' | 'edit'

const toast = useToast()
const confirm = useConfirmDialog()
const deleting = ref(false)
const open = ref(false)
const keysDrawerOpen = ref(false)
const keysDrawerProviderId = ref<string | null>(null)
const modelsDrawerOpen = ref(false)
const modelsDrawerProviderId = ref<string | null>(null)
const mode = ref<ModalMode>('create')
const editingId = ref<string | null>(null)

const { data, refresh } = await useFetch<{ providers: ProviderPublic[] }>('/api/providers')

const isEmpty = computed(() => !data.value?.providers?.length)
const editingProvider = computed(() =>
  data.value?.providers?.find(provider => provider.id === editingId.value) || null,
)
const keysDrawerProvider = computed(() =>
  data.value?.providers?.find(provider => provider.id === keysDrawerProviderId.value) || null,
)
const modelsDrawerProvider = computed(() =>
  data.value?.providers?.find(provider => provider.id === modelsDrawerProviderId.value) || null,
)

useHead({ title: 'Providers · Literoute' })

function openKeysDrawer(provider: ProviderPublic) {
  keysDrawerProviderId.value = provider.id
  keysDrawerOpen.value = true
}

function openModelsDrawer(provider: ProviderPublic) {
  modelsDrawerProviderId.value = provider.id
  modelsDrawerOpen.value = true
}

watch(keysDrawerOpen, (value) => {
  if (!value) {
    keysDrawerProviderId.value = null
  }
})

watch(modelsDrawerOpen, (value) => {
  if (!value) {
    modelsDrawerProviderId.value = null
  }
})

function openCreate() {
  mode.value = 'create'
  editingId.value = null
  open.value = true
}

function openEdit(provider: ProviderPublic) {
  mode.value = 'edit'
  editingId.value = provider.id
  open.value = true
}

if (isEmpty.value) {
  openCreate()
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
      editingId.value = null
    }
    await refresh()
  }
  catch (err: unknown) {
    toast.add({
      title: 'Could not delete provider',
      description: apiErrorMessage(err),
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
      description: apiErrorMessage(err),
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
            Create, edit, and delete OpenAI-compatible providers, keys, and models.
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
              class="py-4"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="font-medium text-highlighted">
                      {{ provider.name }}
                    </p>
                    <UBadge
                      color="neutral"
                      variant="subtle"
                    >
                      {{ providerKeyMethodLabel(provider.keyMethod) }}
                    </UBadge>
                  </div>
                  <p class="text-sm text-muted">
                    {{ provider.slug }} · {{ provider.baseUrl }}
                  </p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <UButton
                    :label="`${provider.keyCount} keys`"
                    color="neutral"
                    variant="soft"
                    size="sm"
                    trailing-icon="i-lucide-panel-right"
                    @click="openKeysDrawer(provider)"
                  />
                  <UButton
                    :label="`${provider.modelCount ?? 0} models`"
                    color="neutral"
                    variant="soft"
                    size="sm"
                    trailing-icon="i-lucide-panel-right"
                    @click="openModelsDrawer(provider)"
                  />
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
            </li>
          </ul>
        </UCard>

        <ProvidersProviderKeysDrawer
          v-model:open="keysDrawerOpen"
          :provider="keysDrawerProvider"
          @refreshed="refresh()"
        />

        <ProvidersProviderModelsDrawer
          v-model:open="modelsDrawerOpen"
          :provider="modelsDrawerProvider"
          @refreshed="refresh()"
        />

        <ProvidersProviderFormModal
          v-model:open="open"
          :mode="mode"
          :editing-provider="editingProvider"
          @saved="refresh()"
          @remove-key="removeKey"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
