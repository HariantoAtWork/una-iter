export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const body = await readBody<ImportProvidersInput>(event)
  return await importProviders(body, event)
})
