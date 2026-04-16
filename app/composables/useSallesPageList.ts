import type { Salle } from '~/types'

export async function useSallesPageList() {
  const { session } = useSupabase()
  const { currentCommune } = useCurrentCommune()

  const sallesFetchHeaders = computed(() => {
    const token = session.value?.access_token
    if (!token)
      return undefined
    return { Authorization: `Bearer ${token}` }
  })

  const { data, status, refresh } = await useFetch<Salle[]>('/api/salles', {
    lazy: true,
    headers: sallesFetchHeaders,
    query: computed(() => ({
      commune_id: currentCommune.value?.id
    }))
  })

  watch(currentCommune, () => {
    refresh()
  })

  return { data, status, refresh }
}
