export async function useStatsMobileData(
  period: Ref<'7d' | '30d' | 'custom'>,
  selectedCommuneId: Ref<string>,
  customStart: Ref<string>,
  customEnd: Ref<string>
) {
  const { session } = useSupabase()

  const authHeaders = computed<Record<string, string> | undefined>(() => {
    const token = session.value?.access_token
    return token ? { Authorization: `Bearer ${token}` } : undefined
  })

  const queryParams = computed(() => {
    const query: Record<string, string> = {
      period: period.value
    }
    if (selectedCommuneId.value) {
      query.commune_id = selectedCommuneId.value
    }
    if (period.value === 'custom') {
      if (customStart.value) query.start = customStart.value
      if (customEnd.value) query.end = customEnd.value
    }
    return query
  })

  const { data, status, refresh, error } = await useFetch('/api/stats/mobile', {
    lazy: true,
    headers: authHeaders,
    query: queryParams
  })

  watch([period, selectedCommuneId, customStart, customEnd], () => {
    if (
      period.value !== 'custom'
      || (period.value === 'custom' && customStart.value && customEnd.value)
    ) {
      refresh()
    }
  })

  return { data, status, refresh, error }
}
