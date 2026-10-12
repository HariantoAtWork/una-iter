export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') {
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
