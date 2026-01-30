import type { Commune } from '~/types'

export interface CurrentUserProfile {
  id: string
  role: 'utilisateur' | 'administrateur'
  communes: Commune[]
}

/**
 * Composable pour accéder au profil de l'utilisateur connecté (role + communes).
 * Utilisé pour afficher/masquer des menus et contrôler l'accès aux pages.
 */
export const useCurrentUser = () => {
  const { session } = useSupabase()
  const sessionToken = computed(() => session.value?.access_token ?? '')

  const currentUser = ref<CurrentUserProfile | null>(null)
  const currentUserPending = ref(false)

  async function fetchCurrentUser() {
    const token = session.value?.access_token
    if (!token) {
      currentUser.value = null
      return
    }
    currentUserPending.value = true
    try {
      const data = await $fetch<CurrentUserProfile>('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      currentUser.value = data
    } catch {
      currentUser.value = null
    } finally {
      currentUserPending.value = false
    }
  }

  if (import.meta.client) {
    watch(
      () => session.value?.access_token,
      (token) => {
        if (token) fetchCurrentUser()
        else currentUser.value = null
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
    refreshCurrentUser: fetchCurrentUser
  }
}
