export default defineNitroPlugin(async () => {
  await resolveAppSecret()
})
