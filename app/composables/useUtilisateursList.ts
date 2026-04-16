import type { Utilisateur } from '~/types'

export async function useUtilisateursList() {
  const { getAuthHeaders } = useApiAuth()
  const authHeaders = computed<HeadersInit>(() => getAuthHeaders())

  const { data: rawData, status, refresh } = await useFetch<Utilisateur[]>('/api/utilisateurs', {
    lazy: true,
    default: () => [],
    headers: authHeaders
  })
  const data = computed<Utilisateur[]>(() => (rawData.value as Utilisateur[] | null) ?? [])

  return { data, status, refresh }
}
