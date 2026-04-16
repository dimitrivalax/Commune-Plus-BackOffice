import type { SortingState } from '@tanstack/table-core'
import type { MunicipalInfo } from '~/types'
import {
  compareIsoDateStrings,
  compareLocaleFr,
  compareOptionalIsoDateNullsLast
} from '~/utils/tableSortCompare'

export function useActualitesPageState(data: Ref<MunicipalInfo[] | null | undefined>) {
  const pagination = ref({
    pageIndex: 0,
    pageSize: 10
  })

  const sorting = ref<SortingState>([])
  const searchQuery = ref('')

  function getPublicationStatusLabel(info: MunicipalInfo): string {
    switch (info.publication_status) {
      case 'scheduled':
        return 'Programmée'
      case 'published':
        return 'Publiée'
      default:
        return 'Brouillon'
    }
  }

  function getPublicationStatusColor(info: MunicipalInfo): 'warning' | 'success' | 'neutral' {
    switch (info.publication_status) {
      case 'scheduled':
        return 'warning'
      case 'published':
        return 'success'
      default:
        return 'neutral'
    }
  }

  function formatDateTime(value: string | null | undefined): string {
    if (!value)
      return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime()))
      return '-'
    return parsed.toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }

  function compareInfosForSort(a: MunicipalInfo, b: MunicipalInfo, columnId: string, desc: boolean): number {
    const dir = desc ? -1 : 1
    let cmp = 0

    switch (columnId) {
      case 'title':
        cmp = compareLocaleFr(a.title, b.title)
        break
      case 'category':
        cmp = compareLocaleFr(a.category, b.category)
        break
      case 'event_date':
        cmp = compareOptionalIsoDateNullsLast(a.event_date, b.event_date)
        break
      case 'publication_status':
        cmp = compareLocaleFr(getPublicationStatusLabel(a), getPublicationStatusLabel(b))
        break
      case 'scheduled_publish_at':
        cmp = compareOptionalIsoDateNullsLast(a.scheduled_publish_at, b.scheduled_publish_at)
        break
      case 'created_at':
        cmp = compareIsoDateStrings(a.created_at, b.created_at)
        break
      default:
        cmp = 0
    }

    return cmp * dir
  }

  function municipalInfoMatchesSearch(info: MunicipalInfo, q: string) {
    if (!q)
      return true
    const needle = q.toLowerCase()
    const hay = [info.title, info.content, info.category]
    return hay.some(v => (v ?? '').toLowerCase().includes(needle))
  }

  const list = computed(() => data.value ?? [])
  const filteredList = computed(() => {
    const q = searchQuery.value.trim()
    if (!q)
      return list.value
    return list.value.filter(info => municipalInfoMatchesSearch(info, q))
  })
  const totalRows = computed(() => filteredList.value.length)

  const sortedFilteredList = computed(() => {
    const nextList = [...filteredList.value]
    const rule = sorting.value[0]
    if (!rule)
      return nextList

    nextList.sort((a, b) => compareInfosForSort(a, b, rule.id, rule.desc))
    return nextList
  })

  const paginatedData = computed(() => {
    const { pageIndex, pageSize } = pagination.value
    const start = pageIndex * pageSize
    return sortedFilteredList.value.slice(start, start + pageSize)
  })

  watch(searchQuery, () => {
    pagination.value.pageIndex = 0
  })

  watch(sorting, () => {
    pagination.value.pageIndex = 0
  }, { deep: true })

  return {
    pagination,
    sorting,
    searchQuery,
    totalRows,
    paginatedData,
    getPublicationStatusLabel,
    getPublicationStatusColor,
    formatDateTime
  }
}
