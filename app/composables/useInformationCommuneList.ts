interface CommuneInformation {
  id: string
  title: string
  description: string
  photo_url?: string | null
  ordre_affichage?: number
  published?: boolean
  commune_id?: string | null
  created_at?: string
}

export async function useInformationCommuneList() {
  const { session } = useSupabase()
  const { currentCommune } = useCurrentCommune()

  const authHeaders = computed<Record<string, string> | undefined>(() => {
    const token = session.value?.access_token
    return token ? { Authorization: `Bearer ${token}` } : undefined
  })

  const { data, status, refresh } = await useFetch<CommuneInformation[]>(
    '/api/information-commune',
    {
      lazy: true,
      headers: authHeaders,
      query: computed(() => ({
        commune_id: currentCommune.value?.id
      }))
    }
  )

  watch(currentCommune, () => refresh())

  return { data, status, refresh }
}
