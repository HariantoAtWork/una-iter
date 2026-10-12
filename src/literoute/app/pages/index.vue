<script setup lang="ts">
const { user, loggedIn, refresh, logout } = useAuth()

await refresh()
if (!loggedIn.value) {
  await navigateTo('/login')
}

useHead({
  title: 'Literoute',
})

async function onLogout() {
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <main class="home">
    <p class="home__brand">
      Literoute
    </p>
    <h1 class="home__title">
      Signed in
    </h1>
    <p class="home__lead">
      Welcome, {{ user?.username }}.
    </p>
    <button
      type="button"
      class="home__logout"
      @click="onLogout"
    >
      Sign out
    </button>
  </main>
</template>

<style scoped>
.home {
  --ink: #14231c;
  --muted: #4d6358;
  --accent: #0f7a5f;
  --accent-ink: #f5fff9;
  --line: color-mix(in oklab, var(--ink) 14%, transparent);

  min-height: 100dvh;
  display: grid;
  align-content: start;
  gap: 0.5rem;
  padding: 2.5rem 1.5rem;
  color: var(--ink);
  background:
    radial-gradient(900px 420px at 0% 0%, #c8e7d8 0%, transparent 55%),
    linear-gradient(160deg, #eef4ef 0%, #e7eee8 100%);
  font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
}

.home__brand {
  margin: 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(2rem, 5vw, 2.6rem);
  font-weight: 600;
  letter-spacing: -0.03em;
}

.home__title {
  margin: 0.4rem 0 0;
  font-size: 1.1rem;
}

.home__lead {
  margin: 0 0 1.25rem;
  color: var(--muted);
}

.home__logout {
  width: fit-content;
  border: 1px solid var(--line);
  border-radius: 0.55rem;
  padding: 0.7rem 1rem;
  background: var(--accent);
  color: var(--accent-ink);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
</style>
