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
    const { getSession } = useSupabase()
    const session = await getSession()

    // Si l'utilisateur n'est pas connecté, rediriger vers login
    if (!session) {
      return navigateTo('/login')
    }
  } catch (error) {
    // En cas d'erreur, rediriger vers login
    console.error('Auth middleware error:', error)
    return navigateTo('/login')
  }
})

