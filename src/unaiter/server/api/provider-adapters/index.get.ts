import { listAdaptersPublic } from '../../utils/providerAdapters'

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  return listAdaptersPublic()
})
