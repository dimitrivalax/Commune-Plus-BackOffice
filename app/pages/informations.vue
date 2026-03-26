<script setup lang="ts">
import type { SortingState } from '@tanstack/table-core'
import type { TableColumn } from '@nuxt/ui'
import type { MunicipalInfo } from '~/types'
import {
  compareIsoDateStrings,
  compareLocaleFr,
  compareOptionalIsoDateNullsLast
} from '~/utils/tableSortCompare'

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')

const sortableHeader = useSortableTableHeader<MunicipalInfo>()

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
    case 'created_at':
      cmp = compareIsoDateStrings(a.created_at, b.created_at)
      break
    default:
      cmp = 0
  }

  return cmp * dir
}

const table = useTemplateRef('table')
const { session } = useSupabase()

const municipalInfoFetchHeaders = computed(() => {
  const token = session.value?.access_token
  if (!token)
    return undefined
  return { Authorization: `Bearer ${token}` }
})

const { currentCommune } = useCurrentCommune()

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

// Rafraîchir quand la commune change
watch(currentCommune, () => {
  refresh()
})

provide('refresh-informations', refresh)

const { publish } = usePublishMunicipalInfo({ onSuccess: refresh })

const selectedInfo = ref<MunicipalInfo | null>(null)
const editModal = useTemplateRef<{ openModal: (info?: MunicipalInfo) => void }>(
  'editModal'
)
const deleteModal = useTemplateRef<{ openModal: () => void }>('deleteModal')

function getRowItems(row: MunicipalInfo) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Modifier',
      icon: 'i-lucide-edit',
      onSelect() {
        selectedInfo.value = row
        editModal.value?.openModal(row)
      }
    },
    {
      label: 'Publier',
      icon: 'i-lucide-send',
      onSelect() {
        publish(row)
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Supprimer',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect() {
        selectedInfo.value = row
        deleteModal.value?.openModal()
      }
    }
  ]
}

function handleRowClick(row: MunicipalInfo) {
  selectedInfo.value = row
  editModal.value?.openModal(row)
}

const columns: TableColumn<MunicipalInfo>[] = [
  {
    accessorKey: 'title',
    header: sortableHeader('Titre'),
    cell: ({ row }) => {
      return h(
        'div',
        {
          class: 'font-medium text-highlighted cursor-pointer',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleRowClick(row.original)
          }
        },
        row.original.title
      )
    }
  },
  {
    accessorKey: 'category',
    header: sortableHeader('Catégorie'),
    cell: ({ row }) => {
      if (!row.original.category) {
        return h(
          'span',
          {
            class: 'text-muted cursor-pointer',
            onClick: (e: Event) => {
              e.stopPropagation()
              handleRowClick(row.original)
            }
          },
          '-'
        )
      }
      return h(
        UBadge,
        {
          variant: 'subtle',
          color: 'primary',
          class: 'cursor-pointer',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleRowClick(row.original)
          }
        },
        () => row.original.category
      )
    }
  },
  {
    accessorKey: 'event_date',
    header: sortableHeader('Date de l\'actualité'),
    cell: ({ row }) => {
      const raw = row.original.event_date
      if (!raw) {
        return h(
          'span',
          {
            class: 'text-muted cursor-pointer',
            onClick: (e: Event) => {
              e.stopPropagation()
              handleRowClick(row.original)
            }
          },
          '-'
        )
      }
      const date = new Date(raw)
      return h(
        'span',
        {
          class: 'text-sm cursor-pointer',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleRowClick(row.original)
          }
        },
        date.toLocaleDateString('fr-FR')
      )
    }
  },
  {
    accessorKey: 'created_at',
    header: sortableHeader('Date de création'),
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return h(
        'span',
        {
          class: 'text-sm cursor-pointer',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleRowClick(row.original)
          }
        },
        date.toLocaleDateString('fr-FR')
      )
    }
  },
  {
    id: 'actions',
    enableSorting: false,
    cell: ({ row }) => {
      return h(
        'div',
        {
          class: 'text-right',
          onClick: (e: Event) => {
            e.stopPropagation()
          }
        },
        h(
          UDropdownMenu,
          {
            content: {
              align: 'end'
            },
            items: getRowItems(row.original)
          },
          () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost',
              class: 'ml-auto'
            })
        )
      )
    }
  }
]

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})

const sorting = ref<SortingState>([])

const searchQuery = ref('')

function municipalInfoMatchesSearch(info: MunicipalInfo, q: string) {
  if (!q)
    return true
  const needle = q.toLowerCase()
  const hay = [info.title, info.content, info.category]
  return hay.some(v => (v ?? '').toLowerCase().includes(needle))
}

// Pagination côté client (sans v-model:pagination sur UTable pour éviter boucle réactive / fuite)
const list = computed(() => data.value ?? [])
const filteredList = computed(() => {
  const q = searchQuery.value.trim()
  if (!q)
    return list.value
  return list.value.filter(info => municipalInfoMatchesSearch(info, q))
})
const totalRows = computed(() => filteredList.value.length)

const sortedFilteredList = computed(() => {
  const list = [...filteredList.value]
  const rule = sorting.value[0]
  if (!rule)
    return list

  list.sort((a, b) => compareInfosForSort(a, b, rule.id, rule.desc))
  return list
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
</script>

<template>
  <UDashboardPanel id="informations">
    <template #header>
      <UDashboardNavbar title="Actualités">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <InformationsAddModal />
            <NotificationBell />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UInput
        v-model="searchQuery"
        class="max-w-sm mb-4"
        icon="i-lucide-search"
        placeholder="Rechercher par titre, contenu ou catégorie..."
      />

      <UTable
        ref="table"
        v-model:sorting="sorting"
        class="shrink-0"
        :data="paginatedData"
        :columns="columns"
        :sorting-options="{ manualSorting: true }"
        :get-row-id="(row: MunicipalInfo) => row.id"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody:
            '[&>tr]:last:[&>td]:border-b-0 [&>tr]:cursor-pointer [&>tr]:hover:bg-elevated/50',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }"
      />

      <div
        class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <div class="text-sm text-muted">
          {{ totalRows }} information(s) au total.
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            :page="pagination.pageIndex + 1"
            :items-per-page="pagination.pageSize"
            :total="totalRows"
            @update:page="(p: number) => { pagination.pageIndex = p - 1 }"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <InformationsEditModal
    ref="editModal"
    :info="selectedInfo"
    @delete="
      (info) => {
        selectedInfo = info;
        deleteModal?.openModal();
      }
    "
  />
  <InformationsDeleteModal ref="deleteModal" :info="selectedInfo" />
</template>
