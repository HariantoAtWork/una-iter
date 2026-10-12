<script lang="ts" setup>
withDefaults(defineProps<{
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'error' | 'primary' | 'neutral' | 'success' | 'warning' | 'info' | 'secondary'
}>(), {
  title: 'Are you sure?',
  description: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  confirmColor: 'error',
})

const emits = defineEmits<{
  close: [value: boolean]
}>()
</script>

<template>
  <UModal
    :title="title"
    :description="description"
    :dismissible="false"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer>
      <UButton
        :label="cancelLabel"
        color="neutral"
        variant="outline"
        @click="emits('close', false)"
      />
      <UButton
        :label="confirmLabel"
        :color="confirmColor"
        @click="emits('close', true)"
      />
    </template>
  </UModal>
</template>
