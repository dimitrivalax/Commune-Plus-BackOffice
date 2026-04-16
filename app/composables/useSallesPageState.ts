import type { SortingState } from '@tanstack/table-core'
import type { Salle } from '~/types'
import {
  compareIsoDateStrings,
  compareLocaleFr,
  compareOptionalStringNullsLast
} from '~/utils/tableSortCompare'

export function useSallesPageState(data: Ref<Salle[] | null | undefined>) {
  const pagination = ref({
    pageIndex: 0,
    pageSize: 10
  })
  const sorting = ref<SortingState>([])
  const searchQuery = ref('')

  function compareSallesForSort(a: Salle, b: Salle, columnId: string, desc: boolean): number {
    const dir = desc ? -1 : 1
    let cmp = 0

    switch (columnId) {
      case 'nom':
        cmp = compareLocaleFr(a.nom, b.nom)
        break
      case 'adresse':
        cmp = compareLocaleFr(a.adresse, b.adresse)
        break
      case 'nombre_max_places':
        cmp = a.nombre_max_places - b.nombre_max_places
        break
      case 'description':
        cmp = compareLocaleFr(a.description, b.description)
        break
      case 'photo_url':
        cmp = compareOptionalStringNullsLast(a.photo_url, b.photo_url)
        break
      case 'created_at':
        cmp = compareIsoDateStrings(a.created_at, b.created_at)
        break
      default:
        cmp = 0
    }

    return cmp * dir
  }

  function salleMatchesSearch(s: Salle, q: string) {
    if (!q)
      return true
    const needle = q.toLowerCase()
    const hay = [s.nom, s.adresse, s.description, String(s.nombre_max_places)]
    return hay.some(v => (v ?? '').toString().toLowerCase().includes(needle))
  }

  const list = computed(() => data.value ?? [])
  const filteredList = computed(() => {
    const q = searchQuery.value.trim()
    if (!q)
      return list.value
    return list.value.filter(s => salleMatchesSearch(s, q))
  })
  const totalRows = computed(() => filteredList.value.length)

  const sortedFilteredList = computed(() => {
    const nextList = [...filteredList.value]
    const rule = sorting.value[0]
    if (!rule)
      return nextList
    nextList.sort((a, b) => compareSallesForSort(a, b, rule.id, rule.desc))
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

  return { pagination, sorting, searchQuery, totalRows, paginatedData }
}
