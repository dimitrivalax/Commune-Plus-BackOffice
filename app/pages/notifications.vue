<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { MunicipalInfo } from '~/types'

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')

const table = useTemplateRef('table')
const { data, status, refresh } = await useNotificationsPageList()

provide('refresh-notifications', refresh)

const { publish } = usePublishMunicipalInfo({
  onSuccess: refresh,
  global: true
})

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
      label: 'Publier (tous les utilisateurs)',
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

const list = computed(() => data.value ?? [])
const totalRows = computed(() => list.value.length)
const paginatedData = computed(() => {
  const { pageIndex, pageSize } = pagination.value
  const start = pageIndex * pageSize
  return list.value.slice(start, start + pageSize)
})
</script>

<template>
  <UDashboardPanel id="notifications">
    <template #header>
      <UDashboardNavbar title="Notifications">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsAddModal />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <p class="text-sm text-muted mb-4">
        Informations générales envoyées à tous les utilisateurs de toutes les communes.
        Catégorie : Information Générale.
      </p>

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
          {{ totalRows }} notification(s) au total.
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

  <NotificationsEditModal
    ref="editModal"
    :info="selectedInfo"
    @delete="
      (info) => {
        selectedInfo = info;
        deleteModal?.openModal();
      }
    "
  />
  <NotificationsDeleteModal ref="deleteModal" :info="selectedInfo" />
</template>
