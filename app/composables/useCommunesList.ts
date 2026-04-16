import type { Commune } from '~/types'

export async function useCommunesList() {
  const { session } = useSupabase()

  const authHeaders = computed(() => {
    const currentSession = session.value
    if (!currentSession?.access_token) {
      return {} as Record<string, string>
    }
    return {
      Authorization: `Bearer ${currentSession.access_token}`
    } as Record<string, string>
  })

  const { data, status, refresh } = await useFetch<Commune[]>('/api/communes', {
    lazy: true,
    default: () => [],
    headers: authHeaders
  })

  return {
    data,
    status,
    refresh
  }
}
