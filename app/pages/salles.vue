<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Salle } from '~/types'

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')

const toast = useToast()
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

const { data, status, refresh } = await useFetch<Salle[]>('/api/salles', {
  lazy: true,
  headers: authHeaders,
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
const editModal = useTemplateRef<{ openModal: () => void }>('editModal')
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
        editModal.value?.openModal()
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
  editModal.value?.openModal()
}

const columns: TableColumn<Salle>[] = [
  {
    accessorKey: 'nom',
    header: 'Nom',
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
    header: 'Adresse',
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
    header: 'Places max',
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
    header: 'Description',
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
    header: 'Photo',
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
        onError: (e: any) => {
          e.target.style.display = 'none'
        }
      })
    }
  },
  {
    accessorKey: 'created_at',
    header: 'Date de création',
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
            items: getRowItems(row)
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
</script>

<template>
  <UDashboardPanel id="salles">
    <template #header>
      <UDashboardNavbar title="Salles">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <SallesAddModal />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTable
        ref="table"
        v-model:pagination="pagination"
        class="shrink-0"
        :data="data"
        :columns="columns"
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
          {{ data?.length || 0 }} salle(s) au total.
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="data?.length || 0"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
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
