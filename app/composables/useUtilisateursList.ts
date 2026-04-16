import type { Utilisateur } from '~/types'

export async function useUtilisateursList() {
  const { session } = useSupabase()

  const authHeaders = computed(() => {
    const currentSession = session.value
    if (!currentSession?.access_token) {
      return {}
    }
    return {
      Authorization: `Bearer ${currentSession.access_token}`
    }
  })

  const { data, status, refresh } = await useFetch<Utilisateur[]>('/api/utilisateurs', {
    lazy: true,
    default: () => [],
    headers: authHeaders
  })

  return { data, status, refresh, authHeaders }
}
