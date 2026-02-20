import type { Commune } from '~/types'

export interface CurrentUserProfile {
  id: string
  role: 'utilisateur' | 'administrateur'
  communes: Commune[]
}

const CACHE_KEY = 'cp_user_role'

function getCachedRole(): CurrentUserProfile['role'] | null {
  if (import.meta.server) return null
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached === 'administrateur' || cached === 'utilisateur') return cached
  } catch {
    // ignore
  }
  return null
}

function setCachedRole(role: CurrentUserProfile['role'] | null) {
  if (import.meta.server) return
  try {
    if (role) sessionStorage.setItem(CACHE_KEY, role)
    else sessionStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Composable pour accéder au profil de l'utilisateur connecté (role + communes).
 * Utilisé pour afficher/masquer des menus et contrôler l'accès aux pages.
 * Le rôle est mis en cache (sessionStorage) ; appliquer le cache après hydratation
 * via refreshFromCache() pour éviter les hydration mismatches (sessionStorage n'existe pas côté serveur).
 */
export const useCurrentUser = () => {
  const { session } = useSupabase()
  const sessionToken = computed(() => session.value?.access_token ?? '')

  const currentUser = ref<CurrentUserProfile | null>(null)
  const currentUserPending = ref(false)

  /** À appeler après hydratation (ex. onMounted) pour afficher tout de suite le rôle en cache. */
  function refreshFromCache() {
    if (import.meta.server) return
    const token = session.value?.access_token
    if (!token) return
    const cached = getCachedRole()
    if (cached) {
      currentUser.value = { id: '', role: cached, communes: [] }
    }
  }

  async function fetchCurrentUser() {
    const token = session.value?.access_token
    if (!token) {
      currentUser.value = null
      setCachedRole(null)
      return
    }
    currentUserPending.value = true
    try {
      const data = await $fetch<CurrentUserProfile>('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      currentUser.value = data
      setCachedRole(data.role)
    } catch {
      currentUser.value = null
      setCachedRole(null)
    } finally {
      currentUserPending.value = false
    }
  }

  if (import.meta.client) {
    watch(
      () => session.value?.access_token,
      (token) => {
        if (token) fetchCurrentUser()
        else {
          currentUser.value = null
          setCachedRole(null)
        }
      },
      { immediate: true }
    )
  }

  const isAdministrator = computed(() => currentUser.value?.role === 'administrateur')
  const isUtilisateur = computed(() => currentUser.value?.role === 'utilisateur')

  return {
    currentUser: readonly(currentUser),
    currentUserPending: readonly(currentUserPending),
    isAdministrator,
    isUtilisateur,
    refreshCurrentUser: fetchCurrentUser,
    refreshFromCache
  }
}
