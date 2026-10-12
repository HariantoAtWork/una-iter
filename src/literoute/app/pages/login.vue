<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { loggedIn, login, refresh } = useAuth()

await refresh()
if (loggedIn.value) {
  await navigateTo('/')
}

useHead({ title: 'Sign in · Literoute' })

const state = reactive({
  username: '',
  password: '',
  rememberMe: true,
})
const error = ref('')
const pending = ref(false)

async function onSubmit() {
  error.value = ''
  pending.value = true
  try {
    await login(state.username, state.password, state.rememberMe)
    await navigateTo('/')
  }
  catch (err: unknown) {
    const statusMessage = (err as { data?: { statusMessage?: string }, statusMessage?: string })
      ?.data
      ?.statusMessage
      || (err as { statusMessage?: string })?.statusMessage
    error.value = statusMessage || 'Could not sign in'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <UCard class="w-full max-w-md">
    <template #header>
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-route"
            class="size-5 text-primary"
          />
          <p class="font-semibold text-highlighted">
            Literoute
          </p>
        </div>
        <h1 class="text-lg font-semibold text-highlighted">
          Sign in
        </h1>
        <p class="text-sm text-muted">
          Use your administrator username or email and password.
        </p>
      </div>
    </template>

    <UForm
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        label="Username or email"
        name="username"
        required
      >
        <UInput
          v-model="state.username"
          autocomplete="username"
          class="w-full"
          autofocus
          required
        />
      </UFormField>

      <UFormField
        label="Password"
        name="password"
        required
      >
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          class="w-full"
          required
        />
      </UFormField>

      <UCheckbox
        v-model="state.rememberMe"
        label="Remember me"
        description="Keep me signed in on this device for 30 days."
      />

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="error"
      />

      <UButton
        type="submit"
        label="Sign in"
        block
        :loading="pending"
      />
    </UForm>
  </UCard>
</template>
