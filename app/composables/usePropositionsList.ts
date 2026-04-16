import type { Proposition } from '~/types'

export async function usePropositionsList() {
  const { session } = useSupabase()
  const { currentCommune } = useCurrentCommune()

  const propositionsFetchHeaders = computed(() => {
    const token = session.value?.access_token
    if (!token)
      return undefined
    return { Authorization: `Bearer ${token}` }
  })

  const { data, status, refresh } = await useFetch<Proposition[]>('/api/propositions', {
    lazy: true,
    headers: propositionsFetchHeaders,
    query: computed(() => ({ commune_id: currentCommune.value?.id }))
  })

  watch(currentCommune, () => {
    refresh()
  })

  return {
    data,
    status,
    refresh
  }
}
