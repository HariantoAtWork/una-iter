export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const body = await readBody<unknown>(event)
  return { providers: parseImportPayload(body) }
})
