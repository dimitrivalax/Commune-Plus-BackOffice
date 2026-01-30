/**
 * Middleware de contrôle d'accès par rôle.
 * Redirige les utilisateurs non administrateurs qui tentent d'accéder aux pages réservées aux admins.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return
  }

  const adminOnlyPaths = ['/utilisateurs', '/communes']
  if (!adminOnlyPaths.some(path => to.path === path || to.path.startsWith(path + '/'))) {
    return
  }

  try {
    const { getSession } = useSupabase()
    const session = await getSession()
    if (!session?.access_token) {
      return navigateTo('/login')
    }

    const me = await $fetch<{ role: string }>('/api/user/me', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    if (me.role !== 'administrateur') {
      return navigateTo('/')
    }
  } catch {
    return navigateTo('/')
  }
})
