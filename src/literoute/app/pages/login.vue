<script setup lang="ts">
const { loggedIn, login, refresh } = useAuth()

await refresh()
if (loggedIn.value) {
  await navigateTo('/')
}

useHead({
  title: 'Sign in · Literoute',
})

const username = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function onSubmit() {
  error.value = ''
  pending.value = true
  try {
    await login(username.value, password.value)
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
  <main class="login">
    <div class="login__glow" aria-hidden="true" />
    <section class="login__panel">
      <p class="login__brand">
        Literoute
      </p>
      <h1 class="login__title">
        Sign in
      </h1>
      <p class="login__lead">
        Use your administrator username or email and password.
      </p>

      <form class="login__form" @submit.prevent="onSubmit">
        <label class="login__field">
          <span>Username or email</span>
          <input
            v-model="username"
            type="text"
            name="username"
            autocomplete="username"
            required
            autofocus
          >
        </label>

        <label class="login__field">
          <span>Password</span>
          <input
            v-model="password"
            type="password"
            name="password"
            autocomplete="current-password"
            required
          >
        </label>

        <p
          v-if="error"
          class="login__error"
          role="alert"
        >
          {{ error }}
        </p>

        <button
          class="login__submit"
          type="submit"
          :disabled="pending"
        >
          {{ pending ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login {
  --ink: #14231c;
  --muted: #4d6358;
  --paper: #f3f6f1;
  --accent: #0f7a5f;
  --accent-ink: #f5fff9;
  --line: color-mix(in oklab, var(--ink) 14%, transparent);
  --danger: #9b2c2c;

  position: relative;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 2rem 1.25rem;
  color: var(--ink);
  background:
    radial-gradient(1200px 600px at 10% -10%, #c8e7d8 0%, transparent 55%),
    radial-gradient(900px 500px at 100% 0%, #d7e4f2 0%, transparent 50%),
    linear-gradient(160deg, #eef4ef 0%, #e7eee8 45%, #dfe8e2 100%);
  font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
  overflow: clip;
}

.login__glow {
  position: absolute;
  inset: auto -20% -30% auto;
  width: min(55vw, 28rem);
  height: min(55vw, 28rem);
  border-radius: 50%;
  background: radial-gradient(circle, rgb(15 122 95 / 18%) 0%, transparent 70%);
  filter: blur(8px);
  animation: drift 12s ease-in-out infinite alternate;
}

.login__panel {
  position: relative;
  width: min(100%, 24rem);
  animation: rise 0.55s ease-out both;
}

.login__brand {
  margin: 0 0 0.35rem;
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(2.4rem, 6vw, 3.2rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1;
}

.login__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.login__lead {
  margin: 0.45rem 0 1.6rem;
  color: var(--muted);
  font-size: 0.98rem;
  line-height: 1.45;
}

.login__form {
  display: grid;
  gap: 1rem;
}

.login__field {
  display: grid;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.login__field input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 0.55rem;
  padding: 0.8rem 0.9rem;
  background: color-mix(in oklab, white 82%, var(--paper));
  color: var(--ink);
  font: inherit;
  font-weight: 500;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.login__field input:focus {
  outline: none;
  border-color: color-mix(in oklab, var(--accent) 70%, var(--ink));
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent);
  transform: translateY(-1px);
}

.login__error {
  margin: 0;
  color: var(--danger);
  font-size: 0.9rem;
  font-weight: 600;
}

.login__submit {
  margin-top: 0.25rem;
  border: 0;
  border-radius: 0.55rem;
  padding: 0.85rem 1rem;
  background: var(--accent);
  color: var(--accent-ink);
  font: inherit;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 0.18s ease, filter 0.18s ease, opacity 0.18s ease;
}

.login__submit:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.login__submit:disabled {
  opacity: 0.7;
  cursor: wait;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-1.5rem, -1rem, 0);
  }
}
</style>
