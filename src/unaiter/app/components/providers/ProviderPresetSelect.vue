<script setup lang="ts">
import type { ProviderPreset, ProviderPresetMenuItem } from '~/utils/providerPresets'
import { providerPresetMenuItems } from '~/utils/providerPresets'

const props = defineProps<{
  modelValue: ProviderPreset | null
}>()

const emit = defineEmits<{
  'update:modelValue': [preset: ProviderPreset | null]
  'select': [preset: ProviderPreset | null]
}>()

const items = providerPresetMenuItems()

const selected = computed({
  get: () => props.modelValue,
  set: (value: ProviderPreset | null) => {
    emit('update:modelValue', value)
    emit('select', value)
  },
})
</script>

<template>
  <USelectMenu
    v-model="selected"
    :items="items"
    :filter-fields="['label', 'description']"
    by="name"
    label-key="label"
    :search-input="{ placeholder: 'Search providers...' }"
    placeholder="Search providers..."
    class="w-full"
  >
    <template #leading="{ modelValue }">
      <UIcon
        v-if="(modelValue as ProviderPreset | null)?.icon"
        :name="(modelValue as ProviderPreset | null)!.icon"
        class="size-4 text-muted"
      />
      <UIcon
        v-else
        name="i-lucide-sparkles"
        class="size-4 text-dimmed"
      />
    </template>

    <template #item="{ item }">
      <div class="flex flex-col gap-0.5">
        <span class="flex items-center gap-1.5 font-medium">
          <UIcon
            v-if="(item as ProviderPresetMenuItem).icon"
            :name="(item as ProviderPresetMenuItem).icon"
            class="size-4 text-muted"
          />
          <span>{{ (item as ProviderPresetMenuItem).label }}</span>
        </span>
        <span
          v-if="(item as ProviderPresetMenuItem).description"
          class="truncate font-mono text-xs text-dimmed"
        >
          {{ (item as ProviderPresetMenuItem).description }}
        </span>
      </div>
    </template>
  </USelectMenu>
</template>
