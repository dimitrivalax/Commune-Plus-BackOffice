import type { MunicipalInfo } from '~/types'

const CATEGORY_INFO_GENERALE = 'Information Générale'

export async function useNotificationsPageList() {
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

  const { data, status, refresh } = await useFetch<MunicipalInfo[]>(
    '/api/municipal-info',
    {
      lazy: true,
      headers: authHeaders,
      query: {
        category: CATEGORY_INFO_GENERALE
      }
    }
  )

  return { data, status, refresh }
}
