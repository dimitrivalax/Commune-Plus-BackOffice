import type { MunicipalInfo } from '~/types'

const CATEGORY_INFO_GENERALE = 'Information Générale'

export async function useNotificationsPageList() {
  const { getAuthHeaders } = useApiAuth()
  const authHeaders = computed<HeadersInit>(() => getAuthHeaders())

  const { data: rawData, status, refresh } = await useFetch<MunicipalInfo[]>(
    '/api/municipal-info',
    {
      lazy: true,
      headers: authHeaders,
      query: {
        category: CATEGORY_INFO_GENERALE
      }
    }
  )
  const data = computed<MunicipalInfo[]>(() => (rawData.value as MunicipalInfo[] | null) ?? [])

  return { data, status, refresh }
}
