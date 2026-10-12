<script setup lang="ts">
useHead({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.bunny.net/css?family=fraunces:600|source-sans-3:400,500,600,700&display=swap',
    },
  ],
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#__nuxt {
  margin: 0;
  min-height: 100%;
}
</style>
