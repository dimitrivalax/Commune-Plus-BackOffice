<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { MunicipalInfo } from '~/types'

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')

const table = useTemplateRef('table')
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

const { currentCommune } = useCurrentCommune()

const { data, status, refresh } = await useFetch<MunicipalInfo[]>(
  '/api/municipal-info',
  {
    lazy: true,
    headers: authHeaders as any,
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
    header: 'Titre',
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
    header: 'Catégorie',
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
    accessorKey: 'created_at',
    header: 'Date de création',
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
const paginatedData = computed(() => {
  const { pageIndex, pageSize } = pagination.value
  const start = pageIndex * pageSize
  return filteredList.value.slice(start, start + pageSize)
})

watch(searchQuery, () => {
  pagination.value.pageIndex = 0
})
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
        class="shrink-0"
        :data="paginatedData"
        :columns="columns"
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
