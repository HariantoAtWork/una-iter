export type AuthUser = {
  username: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const requestFetch = useRequestFetch()

  async function refresh() {
    const data = await requestFetch<{ user: AuthUser | null }>('/api/auth/me')
    user.value = data.user
    return data.user
  }

  async function login(username: string, password: string, rememberMe = true) {
    const data = await $fetch<{ user: AuthUser, rememberMe: boolean }>('/api/auth/login', {
      method: 'POST',
      body: { username, password, rememberMe },
    })
    user.value = data.user
    return data.user
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return {
    user,
    loggedIn: computed(() => !!user.value),
    refresh,
    login,
    logout,
  }
}
