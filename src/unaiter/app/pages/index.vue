<script setup lang="ts">
const { data, status } = await useFetch('/api/overview')

useHead({ title: 'Overview · Una Iter' })
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Overview" />
    </template>

    <template #body>
      <div class="space-y-6">
        <div>
          <h1 class="text-xl font-semibold text-highlighted">
            Overview
          </h1>
          <p class="text-sm text-muted mt-1">
            Snapshot of OpenAI-compatible providers and API keys.
          </p>
        </div>

        <div
          v-if="status === 'pending'"
          class="text-sm text-muted"
        >
          Loading…
        </div>

        <div
          v-else
          class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <UCard>
            <p class="text-sm text-muted">
              Providers
            </p>
            <p class="text-3xl font-semibold text-highlighted mt-2">
              {{ data?.providerCount ?? 0 }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              API keys
            </p>
            <p class="text-3xl font-semibold text-highlighted mt-2">
              {{ data?.keyCount ?? 0 }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              Valid keys
            </p>
            <p class="text-3xl font-semibold text-highlighted mt-2">
              {{ data?.validKeyCount ?? 0 }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              Unchecked keys
            </p>
            <p class="text-3xl font-semibold text-highlighted mt-2">
              {{ data?.uncheckedKeyCount ?? 0 }}
            </p>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold text-highlighted">
                Providers
              </h2>
              <UButton
                to="/providers"
                label="Manage providers"
                icon="i-lucide-arrow-right"
                trailing
                size="sm"
              />
            </div>
          </template>

          <div
            v-if="!data?.providers?.length"
            class="text-sm text-muted"
          >
            No providers yet. Add an OpenAI-compatible provider to get started.
          </div>

          <ul
            v-else
            class="divide-y divide-default"
          >
            <li
              v-for="provider in data.providers"
              :key="provider.id"
              class="py-3 flex items-start justify-between gap-4"
            >
              <div class="min-w-0">
                <p class="font-medium text-highlighted truncate">
                  {{ provider.name }}
                </p>
                <p class="text-sm text-muted truncate">
                  {{ provider.baseUrl }}
                </p>
              </div>
              <div class="text-right shrink-0 text-sm text-muted">
                <p>{{ provider.keyCount }} keys</p>
                <p>{{ provider.validKeyCount }} valid</p>
              </div>
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
