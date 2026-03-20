<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { upperFirst } from 'scule'
import type { Row } from '@tanstack/table-core'
import type { Commune } from '~/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const toast = useToast()
const table = useTemplateRef('table')
const { session } = useSupabase()

const authHeaders = computed(() => {
  const currentSession = session.value
  if (!currentSession?.access_token) {
    return {} as Record<string, string>
  }
  return {
    Authorization: `Bearer ${currentSession.access_token}`
  } as Record<string, string>
})

const nameFilter = ref('')
const columnFilters = ref([{
  id: 'name',
  value: ''
}])
const columnVisibility = ref()
const rowSelection = ref({})

const { data, status, refresh } = await useFetch<Commune[]>('/api/communes', {
  lazy: true,
  default: () => [],
  headers: authHeaders
})

provide('refresh-communes', refresh)

const selectedCommune = ref<Commune | null>(null)
const addModal = useTemplateRef<{ openModal: () => void }>('addModal')
const editModal = useTemplateRef<{ openModal: () => void }>('editModal')
const deleteModal = useTemplateRef<{ openModal: () => void }>('deleteModal')

function getRowItems(row: Row<Commune>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Modifier',
      icon: 'i-lucide-edit',
      async onSelect() {
        selectedCommune.value = row.original
        await nextTick()
        if (editModal.value && typeof editModal.value.openModal === 'function') {
          editModal.value.openModal()
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Copier l\'ID de la commune',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.id.toString())
        toast.add({
          title: 'Copié dans le presse-papiers',
          description: 'ID de la commune copié dans le presse-papiers'
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Supprimer',
      icon: 'i-lucide-trash',
      color: 'error',
      async onSelect() {
        selectedCommune.value = row.original
        await nextTick()
        if (deleteModal.value && typeof deleteModal.value.openModal === 'function') {
          deleteModal.value.openModal()
        }
      }
    }
  ]
}

const columns: TableColumn<Commune>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Tout sélectionner'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'ariaLabel': 'Sélectionner la ligne'
      })
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Nom',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', undefined, [
          h('p', { class: 'font-medium text-highlighted' }, row.original.name),
          h('p', { class: 'text-sm text-muted' }, row.original.postal_code)
        ])
      ])
    }
  },
  {
    accessorKey: 'postal_code',
    header: 'Code postal',
    cell: ({ row }) => row.original.postal_code
  },
  {
    accessorKey: 'email',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'E-mail',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
  },
  {
    accessorKey: 'created_at',
    header: 'Date de création',
    cell: ({ row }) => {
      if (!row.original.created_at) return '-'
      const date = new Date(row.original.created_at)
      return format(date, 'dd/MM/yyyy', { locale: fr })
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return h(
        'div',
        { class: 'text-right' },
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

// Pagination côté client : filtrer puis tronquer par page
const filteredData = computed(() => {
  const list = (data.value as Commune[] | null) || []
  const q = (nameFilter.value || '').toLowerCase().trim()
  if (!q) return list
  return list.filter((c: Commune) => (c.name || '').toLowerCase().includes(q))
})

const totalRows = computed(() => filteredData.value.length)

const paginatedData = computed(() => {
  const fd = filteredData.value
  const { pageIndex, pageSize } = pagination.value
  const start = pageIndex * pageSize
  return fd.slice(start, start + pageSize)
})

watch(nameFilter, () => {
  pagination.value.pageIndex = 0
})

function handleUpdate(updated: Commune) {
  if (!data.value) return
  const list = data.value as Commune[]
  const index = list.findIndex((c: Commune) => c.id === updated.id)
  if (index !== -1) {
    list[index] = updated
  }
  if (selectedCommune.value?.id === updated.id) {
    selectedCommune.value = updated
  }
}

function handleAdd(newCommune: Commune) {
  if (!data.value) return
  const list = data.value as Commune[]
  list.unshift(newCommune)
}
</script>

<template>
  <UDashboardPanel id="communes">
    <template #header>
      <UDashboardNavbar title="Communes">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="nameFilter"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Filtrer par nom..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <UButton
            label="Ajouter une commune"
            color="primary"
            icon="i-lucide-plus"
            @click="addModal?.openModal?.()"
          />
          <UDropdownMenu
            :items="table?.tableApi
              ?.getAllColumns()
              .filter((column: any) => column.getCanHide())
              .map((column: any) => ({
                label: upperFirst(column.id),
                type: 'checkbox' as const,
                checked: column.getIsVisible(),
                onUpdateChecked(checked: boolean) {
                  table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                },
                onSelect(e?: Event) {
                  e?.preventDefault()
                }
              }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              label="Affichage"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
        </div>
      </div>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        class="shrink-0"
        :data="paginatedData"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }"
      />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} sur
          {{ totalRows }} ligne(s) sélectionnée(s).
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

  <CommunesAddModal ref="addModal" @add="handleAdd" />
  <CommunesEditModal
    ref="editModal"
    :commune="selectedCommune"
    @update="handleUpdate"
    @delete="(commune) => {
      selectedCommune = commune
      deleteModal?.openModal()
    }"
  />
  <CommunesDeleteModal ref="deleteModal" :commune="selectedCommune" />
</template>
