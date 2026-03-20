<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { upperFirst } from 'scule'
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
const { currentCommune, userCommunes, userCommunesPending, setCurrentCommune } = useCurrentCommune()

// Gérer la sélection de la commune courante
const selectedCommuneId = computed({
  get: () => currentCommune.value?.id || '',
  set: (value: string) => {
    const commune = userCommunes.value?.find(c => c.id === value)
    if (commune) {
      setCurrentCommune(commune)
    }
  }
})

const communeSelectItems = computed(() =>
  (userCommunes.value || []).map(c => ({
    label: c.name + ' (' + c.postal_code + ')',
    value: c.id
  })))

const authHeaders = computed(() => {
  const currentSession = session.value
  if (!currentSession?.access_token) {
    return {}
  }
  return {
    Authorization: `Bearer ${currentSession.access_token}`
  }
})

const emailFilter = ref('')
const columnFilters = ref([{
  id: 'email',
  value: ''
}])
const columnVisibility = ref()
const rowSelection = ref({})

const { data, status, refresh } = await useFetch<Utilisateur[]>('/api/utilisateurs', {
  lazy: true,
  default: () => [],
  headers: authHeaders
})

provide('refresh-utilisateurs', refresh)

const selectedUtilisateur = ref<Utilisateur | null>(null)
const addModal = useTemplateRef<{ openModal: () => void }>('addModal')
const editModal = useTemplateRef<{ openModal: () => void }>('editModal')
const deleteModal = useTemplateRef<{ openModal: () => void }>('deleteModal')

function getRowItems(row: Row<Utilisateur>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Modifier',
      icon: 'i-lucide-edit',
      async onSelect() {
        selectedUtilisateur.value = row.original
        await nextTick()
        if (editModal.value && typeof editModal.value.openModal === 'function') {
          editModal.value.openModal()
        }
      }
    },
    {
      label: row.original.is_active !== false ? 'Désactiver le compte' : 'Réactiver le compte',
      icon: row.original.is_active !== false ? 'i-lucide-user-x' : 'i-lucide-user-check',
      async onSelect() {
        const u = row.original
        const nextActive = u.is_active === false
        try {
          await $fetch(`/api/utilisateurs/${u.id}`, {
            method: 'PATCH',
            headers: authHeaders.value as HeadersInit,
            body: { is_active: nextActive }
          })
          toast.add({
            title: nextActive ? 'Compte réactivé' : 'Compte désactivé',
            color: 'success'
          })
          refresh()
        } catch (e: any) {
          toast.add({
            title: 'Erreur',
            description: e?.data?.message || e?.message || 'Action impossible',
            color: 'error'
          })
        }
      }
    },
    {
      type: 'separator'
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
      label: 'Supprimer',
      icon: 'i-lucide-trash',
      color: 'error',
      async onSelect() {
        selectedUtilisateur.value = row.original
        await nextTick()
        if (deleteModal.value && typeof deleteModal.value.openModal === 'function') {
          deleteModal.value.openModal()
        }
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
    accessorKey: 'role',
    header: 'Rôle',
    cell: ({ row }) => {
      const role = row.original.role || 'utilisateur'
      const color = role === 'administrateur' ? 'primary' : 'neutral'
      const label = role === 'administrateur' ? 'Administrateur' : 'Utilisateur'
      return h(UBadge, { variant: 'subtle', color }, () => label)
    }
  },
  {
    accessorKey: 'is_active',
    header: 'Statut',
    cell: ({ row }) => {
      const active = row.original.is_active !== false
      const color = active ? 'success' : 'error'
      const label = active ? 'Activé' : 'Désactivé'
      return h(UBadge, { variant: 'subtle', color }, () => label)
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
        communes.map(commune =>
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

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})

// Pagination côté client
const filteredData = computed(() => {
  const list = data.value || []
  const q = (emailFilter.value || '').toLowerCase().trim()
  if (!q) return list
  return list.filter((u: Utilisateur) => (u.email || '').toLowerCase().includes(q))
})

const totalRows = computed(() => filteredData.value.length)

const paginatedData = computed(() => {
  const fd = filteredData.value
  const { pageIndex, pageSize } = pagination.value
  const start = pageIndex * pageSize
  return fd.slice(start, start + pageSize)
})

watch(emailFilter, () => {
  pagination.value.pageIndex = 0
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
      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="emailFilter"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Filtrer les e-mails..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <UButton
            label="Ajouter un utilisateur"
            color="primary"
            icon="i-lucide-plus"
            @click="addModal?.openModal?.()"
          />
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

      <div class="mb-4">
        <UFormField label="Commune courante" name="commune">
          <USelect
            v-if="!userCommunesPending && communeSelectItems.length > 0"
            v-model="selectedCommuneId"
            :items="communeSelectItems"
            placeholder="Sélectionner une commune"
            class="max-w-xs"
          />
          <div v-else-if="userCommunesPending" class="flex items-center gap-2 py-2 text-sm text-muted">
            <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
            <span>Chargement des communes…</span>
          </div>
          <div v-else class="py-2 text-sm text-muted">Aucune commune</div>
        </UFormField>
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

  <UtilisateursAddModal ref="addModal" />
  <UtilisateursEditModal
    ref="editModal"
    :utilisateur="selectedUtilisateur"
    @delete="(utilisateur) => {
      selectedUtilisateur = utilisateur
      deleteModal?.openModal()
    }"
  />
  <UtilisateursDeleteModal ref="deleteModal" :utilisateur="selectedUtilisateur" />
</template>
