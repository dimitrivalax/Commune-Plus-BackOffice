import type { SortingState } from '@tanstack/table-core'
import type { Proposition } from '~/types'

export function usePropositionsPageState(data: Ref<Proposition[] | null | undefined>) {
  const searchQuery = ref('')
  const sorting = ref<SortingState>([])
  const pagination = ref({ pageIndex: 0, pageSize: 10 })

  function propositionMatchesSearch(p: Proposition, q: string) {
    if (!q)
      return true
    const needle = q.toLowerCase()
    const hay = [p.name, p.description, p.user_firstname, p.user_lastname, p.user_email]
    return hay.some(v => (v ?? '').toLowerCase().includes(needle))
  }

  function formatDateTime(value: string | undefined): string {
    if (!value)
      return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime()))
      return '-'
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  }

  const list = computed(() => data.value ?? [])
  const filteredList = computed(() => {
    const q = searchQuery.value.trim()
    if (!q)
      return list.value
    return list.value.filter(item => propositionMatchesSearch(item, q))
  })

  const sortedFilteredList = computed(() => {
    const nextList = [...filteredList.value]
    const rule = sorting.value[0]
    if (!rule)
      return nextList
    const dir = rule.desc ? -1 : 1
    nextList.sort((a, b) => {
      if (rule.id === 'votes_count')
        return ((a.votes_count || 0) - (b.votes_count || 0)) * dir
      if (rule.id === 'is_archived')
        return (Number(a.is_archived) - Number(b.is_archived)) * dir
      if (rule.id === 'updated_at')
        return String(a.updated_at || '').localeCompare(String(b.updated_at || '')) * dir
      return String(a.name || '').localeCompare(String(b.name || '')) * dir
    })
    return nextList
  })

  const totalRows = computed(() => sortedFilteredList.value.length)
  const paginatedData = computed(() => {
    const start = pagination.value.pageIndex * pagination.value.pageSize
    return sortedFilteredList.value.slice(start, start + pagination.value.pageSize)
  })

  watch(searchQuery, () => {
    pagination.value.pageIndex = 0
  })
  watch(sorting, () => {
    pagination.value.pageIndex = 0
  }, { deep: true })

  return {
    searchQuery,
    sorting,
    pagination,
    totalRows,
    paginatedData,
    formatDateTime
  }
}
