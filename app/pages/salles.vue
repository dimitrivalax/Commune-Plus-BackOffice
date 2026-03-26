<script setup lang="ts">
import type { SortingState } from '@tanstack/table-core'
import type { TableColumn } from '@nuxt/ui'
import type { Salle } from '~/types'
import {
  compareIsoDateStrings,
  compareLocaleFr,
  compareOptionalStringNullsLast
} from '~/utils/tableSortCompare'

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')

const sortableHeader = useSortableTableHeader<Salle>()

const table = useTemplateRef('table')
const { session } = useSupabase()

const sallesFetchHeaders = computed(() => {
  const token = session.value?.access_token
  if (!token)
    return undefined
  return { Authorization: `Bearer ${token}` }
})

const { currentCommune } = useCurrentCommune()

const { data, status, refresh } = await useFetch<Salle[]>('/api/salles', {
  lazy: true,
  headers: sallesFetchHeaders,
  query: computed(() => ({
    commune_id: currentCommune.value?.id
  }))
})

// Rafraîchir quand la commune change
watch(currentCommune, () => {
  refresh()
})

provide('refresh-salles', refresh)

const selectedSalle = ref<Salle | null>(null)
const editModal = useTemplateRef<{ openModal: (salle?: Salle | null) => void }>('editModal')
const deleteModal = useTemplateRef<{ openModal: () => void }>('deleteModal')

function getRowItems(row: Salle) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Modifier',
      icon: 'i-lucide-edit',
      onSelect() {
        selectedSalle.value = row
        editModal.value?.openModal(row)
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
        selectedSalle.value = row
        deleteModal.value?.openModal()
      }
    }
  ]
}

function handleRowClick(row: Salle) {
  selectedSalle.value = row
  editModal.value?.openModal(row)
}

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

const columns: TableColumn<Salle>[] = [
  {
    accessorKey: 'nom',
    header: sortableHeader('Nom'),
    cell: ({ row }) => {
      return h('div', {
        class: 'font-medium text-highlighted cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        }
      }, row.original.nom)
    }
  },
  {
    accessorKey: 'adresse',
    header: sortableHeader('Adresse'),
    cell: ({ row }) => {
      return h('p', {
        class: 'text-sm text-muted max-w-md cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        }
      }, row.original.adresse)
    }
  },
  {
    accessorKey: 'nombre_max_places',
    header: sortableHeader('Places max'),
    cell: ({ row }) => {
      return h(UBadge, {
        variant: 'subtle',
        color: 'primary',
        class: 'cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        }
      }, () => `${row.original.nombre_max_places} places`)
    }
  },
  {
    accessorKey: 'description',
    header: sortableHeader('Description'),
    cell: ({ row }) => {
      const description = row.original.description
      if (!description) {
        return h('span', {
          class: 'text-muted cursor-pointer',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleRowClick(row.original)
          }
        }, '-')
      }
      const preview = description.length > 100 ? description.substring(0, 100) + '...' : description
      return h('p', {
        class: 'text-sm text-muted max-w-md cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        }
      }, preview)
    }
  },
  {
    accessorKey: 'photo_url',
    header: sortableHeader('Photo'),
    cell: ({ row }) => {
      if (!row.original.photo_url) {
        return h('span', {
          class: 'text-muted cursor-pointer',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleRowClick(row.original)
          }
        }, '-')
      }
      return h('img', {
        src: row.original.photo_url,
        alt: row.original.nom,
        class: 'w-16 h-16 object-cover rounded-lg cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        },
        onError: (e: Event) => {
          const el = e.target
          if (el instanceof HTMLImageElement)
            el.style.display = 'none'
        }
      })
    }
  },
  {
    accessorKey: 'created_at',
    header: sortableHeader('Date de création'),
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return h('span', {
        class: 'text-sm cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        }
      }, date.toLocaleDateString('fr-FR'))
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

function salleMatchesSearch(s: Salle, q: string) {
  if (!q)
    return true
  const needle = q.toLowerCase()
  const hay = [
    s.nom,
    s.adresse,
    s.description,
    String(s.nombre_max_places)
  ]
  return hay.some(v => (v ?? '').toString().toLowerCase().includes(needle))
}

// Pagination côté client (liste filtrée par recherche)
const list = computed(() => data.value ?? [])
const filteredList = computed(() => {
  const q = searchQuery.value.trim()
  if (!q)
    return list.value
  return list.value.filter(s => salleMatchesSearch(s, q))
})
const totalRows = computed(() => filteredList.value.length)

const sortedFilteredList = computed(() => {
  const list = [...filteredList.value]
  const rule = sorting.value[0]
  if (!rule)
    return list

  list.sort((a, b) => compareSallesForSort(a, b, rule.id, rule.desc))
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
  <UDashboardPanel id="salles">
    <template #header>
      <UDashboardNavbar title="Salles">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <SallesAddModal />
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
        placeholder="Rechercher par nom, adresse, description ou places max..."
      />

      <UTable
        ref="table"
        v-model:sorting="sorting"
        class="shrink-0"
        :data="paginatedData"
        :columns="columns"
        :sorting-options="{ manualSorting: true }"
        :get-row-id="(row: Salle) => row.id"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0 [&>tr]:cursor-pointer [&>tr]:hover:bg-elevated/50',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }"
      />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ totalRows }} salle(s) au total.
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

  <SallesEditModal
    ref="editModal"
    :salle="selectedSalle"
    @delete="(salle) => {
      selectedSalle = salle
      deleteModal?.openModal()
    }"
  />
  <SallesDeleteModal ref="deleteModal" :salle="selectedSalle" />
</template>
