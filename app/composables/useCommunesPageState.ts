import type { Commune } from '~/types'

export function useCommunesPageState(data: Ref<Commune[] | null | undefined>) {
  const nameFilter = ref('')
  const pagination = ref({
    pageIndex: 0,
    pageSize: 10
  })

  const filteredData = computed(() => {
    const list = data.value ?? []
    const q = nameFilter.value.toLowerCase().trim()
    if (!q)
      return list
    return list.filter(c => (c.name || '').toLowerCase().includes(q))
  })

  const totalRows = computed(() => filteredData.value.length)

  const paginatedData = computed(() => {
    const { pageIndex, pageSize } = pagination.value
    const start = pageIndex * pageSize
    return filteredData.value.slice(start, start + pageSize)
  })

  watch(nameFilter, () => {
    pagination.value.pageIndex = 0
  })

  return {
    nameFilter,
    pagination,
    totalRows,
    paginatedData
  }
}
