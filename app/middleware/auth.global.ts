export default defineNuxtRouteMiddleware(async (to) => {
  // Ne s'exécuter que côté client
  if (import.meta.server) {
    return
  }

  // Autoriser l'accès aux pages login et signup sans vérification
  if (to.path === '/login' || to.path === '/signup') {
    return
  }

  try {
    const { getSession, signOut } = useSupabase()
    const session = await getSession()

    // Si l'utilisateur n'est pas connecté, rediriger vers login
    if (!session) {
      return navigateTo('/login')
    }

    try {
      await $fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
    } catch (error: unknown) {
      const status
        = typeof error === 'object' && error !== null
          ? (error as { statusCode?: number, status?: number, response?: { status?: number } }).statusCode
          ?? (error as { statusCode?: number, status?: number, response?: { status?: number } }).status
          ?? (error as { statusCode?: number, status?: number, response?: { status?: number } }).response?.status
          : undefined
      if (status === 403) {
        await signOut()
        return navigateTo({ path: '/login', query: { raison: 'desactive' } })
      }
    }
  } catch (error) {
    // En cas d'erreur, rediriger vers login
    console.error('Auth middleware error:', error)
    return navigateTo('/login')
  }
})
