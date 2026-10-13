export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login' || to.path.startsWith('/v1')) {
    return
  }

  const { loggedIn, refresh } = useAuth()
  if (!loggedIn.value) {
    await refresh()
  }

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
