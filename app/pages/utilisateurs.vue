<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { upperFirst } from 'scule'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'
import type { Utilisateur } from '~/types'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const UAvatar = resolveComponent('UAvatar')
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
    return {}
  }
  return {
    Authorization: `Bearer ${currentSession.access_token}`
  }
})

const columnFilters = ref([{
  id: 'email',
  value: ''
}])
const columnVisibility = ref()
const rowSelection = ref({})

const { data, status } = await useFetch<Utilisateur[]>('/api/utilisateurs', {
  lazy: true,
  default: () => [],
  headers: authHeaders
})

function getRowItems(row: Row<Utilisateur>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Copier l\'ID de l\'utilisateur',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.id.toString())
        toast.add({
          title: 'Copié dans le presse-papiers',
          description: 'ID de l\'utilisateur copié dans le presse-papiers'
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Voir les détails de l\'utilisateur',
      icon: 'i-lucide-list'
    },
    {
      type: 'separator'
    },
    {
      label: 'Supprimer l\'utilisateur',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect() {
        toast.add({
          title: 'Utilisateur supprimé',
          description: 'L\'utilisateur a été supprimé.'
        })
      }
    }
  ]
}

function formatAddress(utilisateur: Utilisateur): string {
  const parts = []
  if (utilisateur.numero_de_rue) parts.push(utilisateur.numero_de_rue)
  if (utilisateur.rue) parts.push(utilisateur.rue)
  if (utilisateur.code_postal) parts.push(utilisateur.code_postal)
  if (utilisateur.ville) parts.push(utilisateur.ville)
  return parts.length > 0 ? parts.join(' ') : '-'
}

function formatCommunes(utilisateur: Utilisateur): string {
  if (!utilisateur.communes || utilisateur.communes.length === 0) {
    return '-'
  }
  return utilisateur.communes.map(c => c.name).join(', ')
}

const columns: TableColumn<Utilisateur>[] = [
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
    accessorKey: 'last_sign_in_at',
    header: 'Dernière connexion',
    cell: ({ row }) => {
      const lastSignIn = row.original.last_sign_in_at
      if (!lastSignIn) {
        return h('span', { class: 'text-gray-400' }, 'Jamais connecté')
      }
      const date = new Date(lastSignIn)
      const formattedDate = format(date, 'dd/MM/yyyy à HH:mm', { locale: fr })
      const relativeDate = formatDistanceToNow(date, { addSuffix: true, locale: fr })
      return h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'text-sm' }, formattedDate),
        h('span', { class: 'text-xs text-gray-500' }, relativeDate)
      ])
    }
  },
  {
    accessorKey: 'nom',
    header: 'Nom',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, {
          src: `https://ui-avatars.com/api/?name=${encodeURIComponent(row.original.prenom + ' ' + row.original.nom)}&background=random`,
          size: 'lg'
        }),
        h('div', undefined, [
          h('p', { class: 'font-medium text-highlighted' }, `${row.original.prenom} ${row.original.nom}`),
          h('p', { class: 'text-sm text-muted' }, row.original.email)
        ])
      ])
    }
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
    accessorKey: 'adresse',
    header: 'Adresse',
    cell: ({ row }) => formatAddress(row.original)
  },
  {
    accessorKey: 'communes',
    header: 'Communes',
    cell: ({ row }) => {
      const communes = row.original.communes || []
      if (communes.length === 0) {
        return h('span', { class: 'text-muted' }, '-')
      }
      return h('div', { class: 'flex flex-wrap gap-1' }, 
        communes.map((commune) =>
          h(UBadge, { variant: 'subtle', color: 'primary' }, () => commune.name)
        )
      )
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

const email = computed({
  get: (): string => {
    return (table.value?.tableApi?.getColumn('email')?.getFilterValue() as string) || ''
  },
  set: (value: string) => {
    table.value?.tableApi?.getColumn('email')?.setFilterValue(value || undefined)
  }
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})
</script>

<template>
  <UDashboardPanel id="utilisateurs">
    <template #header>
      <UDashboardNavbar title="Utilisateurs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="email"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Filtrer les e-mails..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <UDropdownMenu
            :items="
              table?.tableApi
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
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        class="shrink-0"
        :data="data || []"
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} ligne(s) sélectionnée(s).
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
