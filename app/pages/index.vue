<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface CommuneInformation {
  id: string
  title: string
  description: string
  photo_url?: string | null
  ordre_affichage?: number
  published?: boolean
  commune_id?: string | null
  created_at?: string
}

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { data, status, refresh } = await useInformationCommuneList()
provide('refresh-information-commune', refresh)

const searchQuery = ref('')
const selected = ref<CommuneInformation | null>(null)
const editModal = useTemplateRef<{ openModal: (info?: CommuneInformation) => void }>(
  'editModal'
)
const deleteModal = useTemplateRef<{ openModal: () => void }>('deleteModal')

const filteredData = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const list = ((data.value ?? []) as CommuneInformation[]).slice().sort((a, b) => {
    const ao = a.ordre_affichage ?? 0
    const bo = b.ordre_affichage ?? 0
    return ao - bo
  })
  if (!q) return list
  return list.filter(item =>
    [item.title, item.description].some(v => (v ?? '').toLowerCase().includes(q))
  )
})

function openEditModal(item: CommuneInformation) {
  selected.value = item
  editModal.value?.openModal(item)
}

function openDeleteModal(item: CommuneInformation) {
  selected.value = item
  deleteModal.value?.openModal()
}

const toast = useToast()
const { reorderInformation } = useInformationCommuneService()

function getSortedList() {
  return ((data.value ?? []) as CommuneInformation[]).slice().sort((a, b) => {
    const ao = a.ordre_affichage ?? 0
    const bo = b.ordre_affichage ?? 0
    return ao - bo
  })
}

function canMove(row: CommuneInformation, direction: 'up' | 'down') {
  const sorted = getSortedList()
  const index = sorted.findIndex(item => item.id === row.id)
  if (index === -1) return false
  return direction === 'up' ? index > 0 : index < sorted.length - 1
}

async function moveRow(row: CommuneInformation, direction: 'up' | 'down') {
  try {
    await reorderInformation({
      id: row.id,
      commune_id: row.commune_id,
      direction
    })
    await refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: (error as Error)?.message || 'Impossible de réordonner',
      color: 'error'
    })
  }
}

function getRowItems(row: CommuneInformation) {
  return [
    {
      label: 'Modifier',
      icon: 'i-lucide-edit',
      onSelect() {
        openEditModal(row)
      }
    },
    {
      label: 'Monter',
      icon: 'i-lucide-arrow-up',
      disabled: !canMove(row, 'up'),
      onSelect() {
        moveRow(row, 'up')
      }
    },
    {
      label: 'Descendre',
      icon: 'i-lucide-arrow-down',
      disabled: !canMove(row, 'down'),
      onSelect() {
        moveRow(row, 'down')
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
        openDeleteModal(row)
      }
    }
  ]
}

const columns: TableColumn<CommuneInformation>[] = [
  { accessorKey: 'title', header: 'Titre' },
  {
    accessorKey: 'ordre_affichage',
    header: 'Ordre',
    cell: ({ row }) => String((row.original.ordre_affichage ?? 1))
  },
  {
    accessorKey: 'published',
    header: 'Statut',
    cell: ({ row }) => row.original.published ? 'Publié' : 'Non publié'
  },
  {
    accessorKey: 'photo_url',
    header: 'Photo',
    cell: ({ row }) => {
      if (!row.original.photo_url) return h('span', { class: 'text-muted' }, '-')
      return h('img', {
        src: row.original.photo_url,
        alt: row.original.title,
        class: 'h-10 w-16 rounded object-cover'
      })
    }
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h(
        UDropdownMenu,
        {
          content: { align: 'end' },
          items: getRowItems(row.original)
        },
        () =>
          h(UButton, {
            icon: 'i-lucide-ellipsis-vertical',
            color: 'neutral',
            variant: 'ghost'
          })
      )
  }
]
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Accueil" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <InformationCommuneAddModal />
            <NotificationBell />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              Informations pratiques de la commune
            </h1>
            <p class="text-gray-600 dark:text-gray-400">
              Gérez le contenu affiché sur l'accueil mobile
            </p>
          </div>
        </div>

        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Rechercher par titre ou description..."
        />

        <UTable
          :data="filteredData"
          :columns="columns"
          :loading="status === 'pending'"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
            td: 'border-b border-default'
          }"
        />
      </div>
    </template>
  </UDashboardPanel>

  <InformationCommuneEditModal
    ref="editModal"
    :info="selected"
    @delete="
      (info) => {
        selected = info
        deleteModal?.openModal()
      }
    "
  />
  <InformationCommuneDeleteModal ref="deleteModal" :info="selected" />
</template>
