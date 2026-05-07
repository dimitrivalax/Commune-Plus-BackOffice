<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Proposition } from '~/types'
import { getErrorMessage } from '~/utils/errorMessage'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { currentCommune } = useCurrentCommune()
const toast = useToast()
const { data, status, refresh } = await usePropositionsList()
const { toggleArchiveProposition, duplicateProposition: duplicatePropositionRequest } = usePropositionsService()
const {
  searchQuery,
  sorting,
  pagination,
  totalRows,
  paginatedData,
  formatDateTime
} = usePropositionsPageState(data)

provide('refresh-propositions', refresh)

const isPropositionsMobileDisabled = computed(
  () => currentCommune.value?.feature_propositions === false
)

const selectedProposition = ref<Proposition | null>(null)
const editModal = useTemplateRef<{ openModal: (info?: Proposition) => void }>('editModal')
const deleteModal = useTemplateRef<{ openModal: () => void }>('deleteModal')

function handleRowClick(row: Proposition) {
  selectedProposition.value = row
  editModal.value?.openModal(row)
}

async function toggleArchive(row: Proposition) {
  try {
    await toggleArchiveProposition(row)
    toast.add({
      title: 'Succès',
      description: row.is_archived ? 'La proposition a été restaurée' : 'La proposition a été archivée',
      color: 'success'
    })
    refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: getErrorMessage(error, 'Action impossible'),
      color: 'error'
    })
  }
}

async function duplicateProposition(row: Proposition) {
  try {
    await duplicatePropositionRequest({ source: row })
    toast.add({
      title: 'Succès',
      description: 'La proposition a été dupliquée',
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

function getRowItems(row: Proposition) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Modifier',
      icon: 'i-lucide-edit',
      onSelect() {
        selectedProposition.value = row
        editModal.value?.openModal(row)
      }
    },
    {
      label: row.is_archived ? 'Restaurer' : 'Archiver',
      icon: row.is_archived ? 'i-lucide-rotate-ccw' : 'i-lucide-archive',
      onSelect() {
        toggleArchive(row)
      }
    },
    {
      label: 'Dupliquer',
      icon: 'i-lucide-copy-plus',
      onSelect() {
        duplicateProposition(row)
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
        selectedProposition.value = row
        deleteModal.value?.openModal()
      }
    }
  ]
}

const columns: TableColumn<Proposition>[] = [
  {
    accessorKey: 'name',
    header: 'Titre',
    cell: ({ row }) => h(
      'div',
      {
        class: 'font-medium text-highlighted cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        }
      },
      row.original.name
    )
  },
  {
    accessorKey: 'is_archived',
    header: 'Statut',
    cell: ({ row }) =>
      h(
        UBadge,
        {
          variant: 'subtle',
          color: row.original.is_archived ? 'neutral' : 'success',
          class: 'cursor-pointer',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleRowClick(row.original)
          }
        },
        () => (row.original.is_archived ? 'Archivée' : 'Active')
      )
  },
  {
    accessorKey: 'votes_count',
    header: 'Votes',
    cell: ({ row }) =>
      h('span', {
        class: 'cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        }
      }, String(row.original.votes_count || 0))
  },
  {
    accessorKey: 'comments_public',
    header: 'Commentaires',
    cell: ({ row }) =>
      h('span', {
        class: 'cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        }
      }, row.original.comments_public ? 'Public' : 'Privé')
  },
  {
    accessorKey: 'updated_at',
    header: 'Date de modification',
    cell: ({ row }) =>
      h('span', {
        class: 'text-sm cursor-pointer',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleRowClick(row.original)
        }
      }, formatDateTime(row.original.updated_at))
  },
  {
    id: 'actions',
    enableSorting: false,
    cell: ({ row }) =>
      h(
        'div',
        {
          class: 'text-right',
          onClick: (e: Event) => {
            e.stopPropagation()
          }
        },
        h(
          UDropdownMenu,
          { content: { align: 'end' }, items: getRowItems(row.original) },
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
]
</script>

<template>
  <UDashboardPanel id="propositions">
    <template #header>
      <UDashboardNavbar title="Propositions">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <PropositionsAddModal />
            <NotificationBell />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <CommuneMobileFeatureDisabledBanner
        v-if="isPropositionsMobileDisabled"
        feature="propositions"
      />

      <div class="flex items-center justify-between gap-3 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Rechercher (titre, description, auteur...)"
        />
      </div>

      <UTable
        v-model:sorting="sorting"
        :data="paginatedData"
        :columns="columns"
        :loading="status === 'pending'"
        :sorting-options="{ manualSorting: true }"
        :get-row-id="(row: Proposition) => row.id"
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

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-4">
        <div class="text-sm text-muted">
          {{ totalRows }} proposition(s) au total.
        </div>
        <UPagination
          :page="pagination.pageIndex + 1"
          :items-per-page="pagination.pageSize"
          :total="totalRows"
          @update:page="(p: number) => { pagination.pageIndex = p - 1 }"
        />
      </div>
    </template>
  </UDashboardPanel>

  <PropositionsEditModal
    ref="editModal"
    :proposition="selectedProposition"
    @delete="
      (proposition) => {
        selectedProposition = proposition;
        deleteModal?.openModal();
      }
    "
  />
  <PropositionsDeleteModal ref="deleteModal" :proposition="selectedProposition" />
</template>
