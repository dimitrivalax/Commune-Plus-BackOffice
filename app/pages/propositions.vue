<script setup lang="ts">
import type { SortingState } from "@tanstack/table-core";
import type { TableColumn } from "@nuxt/ui";
import type { Proposition } from "~/types";

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const { session } = useSupabase();
const { currentCommune } = useCurrentCommune();

const propositionsFetchHeaders = computed(() => {
  const token = session.value?.access_token;
  if (!token) return undefined;
  return { Authorization: `Bearer ${token}` };
});

const { data, status, refresh } = await useFetch<Proposition[]>("/api/propositions", {
  lazy: true,
  headers: propositionsFetchHeaders,
  query: computed(() => ({ commune_id: currentCommune.value?.id })),
});

watch(currentCommune, () => {
  refresh();
});

provide("refresh-propositions", refresh);

const isPropositionsMobileDisabled = computed(
  () => currentCommune.value?.feature_propositions === false,
);

const searchQuery = ref("");
const sorting = ref<SortingState>([]);
const pagination = ref({ pageIndex: 0, pageSize: 10 });

const selectedProposition = ref<Proposition | null>(null);
const editModal = useTemplateRef<{ openModal: (info?: Proposition) => void }>("editModal");
const deleteModal = useTemplateRef<{ openModal: () => void }>("deleteModal");

function propositionMatchesSearch(p: Proposition, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  const hay = [p.name, p.description, p.user_firstname, p.user_lastname, p.user_email];
  return hay.some(v => (v ?? "").toLowerCase().includes(needle));
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

const list = computed(() => data.value ?? []);
const filteredList = computed(() => {
  const q = searchQuery.value.trim();
  if (!q) return list.value;
  return list.value.filter(item => propositionMatchesSearch(item, q));
});

const sortedFilteredList = computed(() => {
  const list = [...filteredList.value];
  const rule = sorting.value[0];
  if (!rule) return list;
  const dir = rule.desc ? -1 : 1;
  list.sort((a, b) => {
    if (rule.id === "votes_count") return ((a.votes_count || 0) - (b.votes_count || 0)) * dir;
    if (rule.id === "is_archived") return (Number(a.is_archived) - Number(b.is_archived)) * dir;
    if (rule.id === "updated_at") return String(a.updated_at || "").localeCompare(String(b.updated_at || "")) * dir;
    return String(a.name || "").localeCompare(String(b.name || "")) * dir;
  });
  return list;
});

const totalRows = computed(() => sortedFilteredList.value.length);
const paginatedData = computed(() => {
  const start = pagination.value.pageIndex * pagination.value.pageSize;
  return sortedFilteredList.value.slice(start, start + pagination.value.pageSize);
});

watch(searchQuery, () => {
  pagination.value.pageIndex = 0;
});
watch(sorting, () => {
  pagination.value.pageIndex = 0;
}, { deep: true });

function handleRowClick(row: Proposition) {
  selectedProposition.value = row;
  editModal.value?.openModal(row);
}

async function toggleArchive(row: Proposition) {
  if (!session.value?.access_token) return;
  await $fetch(`/api/propositions/${row.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${session.value.access_token}` },
    body: { is_archived: !row.is_archived },
  });
  refresh();
}

async function duplicateProposition(row: Proposition) {
  if (!session.value?.access_token) return;
  await $fetch("/api/propositions", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.value.access_token}` },
    body: {
      commune_id: row.commune_id,
      name: `${row.name} (copie)`,
      description: row.description,
      photo_url: row.photo_url ?? null,
      comments_public: row.comments_public !== false,
    },
  });
  refresh();
}

function getRowItems(row: Proposition) {
  return [
    {
      type: "label",
      label: "Actions",
    },
    {
      label: "Modifier",
      icon: "i-lucide-edit",
      onSelect() {
        selectedProposition.value = row;
        editModal.value?.openModal(row);
      },
    },
    {
      label: row.is_archived ? "Restaurer" : "Archiver",
      icon: row.is_archived ? "i-lucide-rotate-ccw" : "i-lucide-archive",
      onSelect() {
        toggleArchive(row);
      },
    },
    {
      label: "Dupliquer",
      icon: "i-lucide-copy-plus",
      onSelect() {
        duplicateProposition(row);
      },
    },
    {
      type: "separator",
    },
    {
      label: "Supprimer",
      icon: "i-lucide-trash",
      color: "error",
      onSelect() {
        selectedProposition.value = row;
        deleteModal.value?.openModal();
      },
    },
  ];
}

const columns: TableColumn<Proposition>[] = [
  {
    accessorKey: "name",
    header: "Titre",
    cell: ({ row }) => h(
      "div",
      {
        class: "font-medium text-highlighted cursor-pointer",
        onClick: (e: Event) => {
          e.stopPropagation();
          handleRowClick(row.original);
        },
      },
      row.original.name,
    ),
  },
  {
    accessorKey: "is_archived",
    header: "Statut",
    cell: ({ row }) =>
      h(
        UBadge,
        {
          variant: "subtle",
          color: row.original.is_archived ? "neutral" : "success",
          class: "cursor-pointer",
          onClick: (e: Event) => {
            e.stopPropagation();
            handleRowClick(row.original);
          },
        },
        () => (row.original.is_archived ? "Archivée" : "Active"),
      ),
  },
  {
    accessorKey: "votes_count",
    header: "Votes",
    cell: ({ row }) =>
      h("span", {
        class: "cursor-pointer",
        onClick: (e: Event) => {
          e.stopPropagation();
          handleRowClick(row.original);
        },
      }, String(row.original.votes_count || 0)),
  },
  {
    accessorKey: "updated_at",
    header: "Date de modification",
    cell: ({ row }) =>
      h("span", {
        class: "text-sm cursor-pointer",
        onClick: (e: Event) => {
          e.stopPropagation();
          handleRowClick(row.original);
        },
      }, formatDateTime(row.original.updated_at)),
  },
  {
    id: "actions",
    enableSorting: false,
    cell: ({ row }) =>
      h(
        "div",
        {
          class: "text-right",
          onClick: (e: Event) => {
            e.stopPropagation();
          },
        },
        h(
          UDropdownMenu,
          { content: { align: "end" }, items: getRowItems(row.original) },
          () =>
            h(UButton, {
              icon: "i-lucide-ellipsis-vertical",
              color: "neutral",
              variant: "ghost",
              class: "ml-auto",
            }),
        ),
      ),
  },
];
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
