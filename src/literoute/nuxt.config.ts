// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    // Server-only. Override at runtime with NUXT_ADMINISTRATOR_USERNAME.
    administratorUsername: process.env.ADMINISTRATOR_USERNAME || '',
    // Server-only. Override at runtime with NUXT_ADMINISTRATOR_PASSWORD.
    administratorPassword: process.env.ADMINISTRATOR_PASSWORD || '',
    // Server-only. Override at runtime with NUXT_DATA_ROOT.
    dataRoot: './data',
  },
})
