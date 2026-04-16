<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { MunicipalInfo } from '~/types'
import { getErrorMessage } from '~/utils/errorMessage'

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')

const sortableHeader = useSortableTableHeader<MunicipalInfo>()

const table = useTemplateRef('table')
const { session } = useSupabase()
const toast = useToast()
const { duplicateMunicipalInfo } = useMunicipalInfoService()
const { data, status, refresh } = await useMunicipalInfoList()
const {
  pagination,
  sorting,
  searchQuery,
  totalRows,
  paginatedData,
  getPublicationStatusLabel,
  getPublicationStatusColor,
  formatDateTime
} = useActualitesPageState(data)

provide('refresh-actualites', refresh)

const { publish } = usePublishMunicipalInfo({ onSuccess: refresh })

const selectedInfo = ref<MunicipalInfo | null>(null)
const editModal = useTemplateRef<{ openModal: (info?: MunicipalInfo) => void }>(
  'editModal'
)
const deleteModal = useTemplateRef<{ openModal: () => void }>('deleteModal')

async function duplicateInfo(row: MunicipalInfo) {
  if (!session.value) {
    toast.add({
      title: 'Erreur',
      description: 'Vous devez être connecté pour dupliquer une actualité.',
      color: 'error'
    })
    return
  }

  try {
    await duplicateMunicipalInfo({
      source: row
    })

    toast.add({
      title: 'Succès',
      description: 'L’actualité a été dupliquée',
      color: 'success'
    })
    refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: getErrorMessage(error, 'Duplication impossible'),
      color: 'error'
    })
  }
}

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
      label: row.publication_status === 'scheduled' ? 'Publier maintenant' : 'Publier',
      icon: 'i-lucide-send',
      onSelect() {
        publish(row)
      }
    },
    {
      label: 'Dupliquer',
      icon: 'i-lucide-copy-plus',
      onSelect() {
        duplicateInfo(row)
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
    accessorKey: 'publication_status',
    header: sortableHeader('Statut'),
    cell: ({ row }) => h(
      UBadge,
      {
        variant: 'subtle',
        color: getPublicationStatusColor(row.original),
        class: 'cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        }
      },
      () => getPublicationStatusLabel(row.original)
    )
  },
  {
    accessorKey: 'scheduled_publish_at',
    header: sortableHeader('Publication prévue'),
    cell: ({ row }) => h(
      'span',
      {
        class: 'text-sm cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        }
      },
      formatDateTime(row.original.scheduled_publish_at)
    )
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
</script>

<template>
  <UDashboardPanel id="actualites">
    <template #header>
      <UDashboardNavbar title="Actualités">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <ActualitesAddModal />
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

  <ActualitesEditModal
    ref="editModal"
    :info="selectedInfo"
    @delete="
      (info) => {
        selectedInfo = info;
        deleteModal?.openModal();
      }
    "
  />
  <ActualitesDeleteModal ref="deleteModal" :info="selectedInfo" />
</template>
