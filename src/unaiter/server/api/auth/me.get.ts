export default defineEventHandler(async (event) => {
  const session = await useAuthSession(event)
  const user = session.data.user

  if (!user?.username) {
    return { user: null }
  }

  return { user }
})
