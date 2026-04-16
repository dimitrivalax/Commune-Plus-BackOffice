import type { MunicipalInfo } from '~/types'

export async function useMunicipalInfoList() {
  const { session } = useSupabase()
  const { currentCommune } = useCurrentCommune()

  const municipalInfoFetchHeaders = computed(() => {
    const token = session.value?.access_token
    if (!token)
      return undefined
    return { Authorization: `Bearer ${token}` }
  })

  const { data, status, refresh } = await useFetch<MunicipalInfo[]>(
    '/api/municipal-info',
    {
      lazy: true,
      headers: municipalInfoFetchHeaders,
      query: computed(() => ({
        commune_id: currentCommune.value?.id
      }))
    }
  )

  watch(currentCommune, () => {
    refresh()
  })

  return {
    data,
    status,
    refresh
  }
}
