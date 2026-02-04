<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { breakpointsTailwind } from "@vueuse/core";
import type { Proposition } from "~/types";
import PropositionsList from "~/components/propositions/PropositionsList.vue";
import PropositionDetail from "~/components/propositions/PropositionDetail.vue";

const tabItems = [
  {
    label: "Toutes",
    value: "all",
  },
  {
    label: "Actives",
    value: "active",
  },
  {
    label: "Archivées",
    value: "archive",
  },
];
const selectedTab = ref("active");

const { currentCommune } = useCurrentCommune();
const { session } = useSupabase();

const propositions = ref<Proposition[]>([]);
const propositionsPending = ref(false);

async function fetchPropositions() {
  const token = session.value?.access_token;
  if (!token) return;
  propositionsPending.value = true;
  try {
    const data = await $fetch<Proposition[]>("/api/propositions", {
      query: { commune_id: currentCommune.value?.id },
      headers: { Authorization: `Bearer ${token}` },
    });
    propositions.value = data ?? [];
  } catch (e) {
    propositions.value = [];
  } finally {
    propositionsPending.value = false;
  }
}

watch(
  [() => session.value?.access_token, currentCommune],
  () => {
    if (import.meta.client && session.value?.access_token) {
      fetchPropositions();
    }
  },
  { immediate: true },
);

const filteredPropositions = computed(() => {
  if (selectedTab.value === "all") {
    return propositions.value;
  }
  if (selectedTab.value === "active") {
    return propositions.value.filter((p) => !p.is_archived);
  }
  return propositions.value.filter((p) => p.is_archived);
});

const selectedProposition = ref<Proposition | null>(null);

const isPropositionPanelOpen = computed({
  get() {
    return !!selectedProposition.value;
  },
  set(value: boolean) {
    if (!value) {
      selectedProposition.value = null;
    }
  },
});

const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller("lg");

const handleUpdate = (updated: Proposition) => {
  const index = propositions.value.findIndex(
    (p: Proposition) => p.id === updated.id,
  );
  if (index !== -1) {
    propositions.value[index] = updated;
  }
  if (
    selectedProposition.value &&
    selectedProposition.value.id === updated.id
  ) {
    selectedProposition.value = updated;
  }
};
</script>

<template>
  <UDashboardPanel id="propositions">
    <template #header>
      <UDashboardNavbar title="Cahier de Doléances">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationBell />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        class="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-default"
      >
        <div class="flex items-center gap-2">
          <UTabs
            v-model="selectedTab"
            :items="tabItems"
            :content="false"
            size="xs"
          />
        </div>
        <UBadge :label="filteredPropositions.length" variant="subtle" />
      </div>

      <div class="flex gap-4 h-[calc(100vh-12rem)]">
        <div class="w-1/3 min-w-[300px] max-w-[400px]">
          <div
            class="h-full border border-default rounded-lg overflow-hidden bg-default/10"
          >
            <PropositionsList
              v-model="selectedProposition"
              :propositions="filteredPropositions"
            />
            <div v-if="propositionsPending" class="p-4 text-center">
              <UIcon name="i-lucide-loader-2" class="animate-spin" />
            </div>
            <div
              v-else-if="filteredPropositions.length === 0"
              class="p-8 text-center text-dimmed italic text-sm"
            >
              Aucune doléance trouvée.
            </div>
          </div>
        </div>

        <div v-if="selectedProposition" class="hidden lg:block flex-1 min-w-0">
          <PropositionDetail
            :proposition="selectedProposition"
            @close="selectedProposition = null"
            @update="handleUpdate"
          />
        </div>
        <div
          v-else
          class="hidden lg:flex flex-1 items-center justify-center border border-default rounded-lg bg-default/5"
        >
          <div class="text-center text-dimmed">
            <UIcon
              name="i-lucide-book"
              class="size-24 mb-4 opacity-20 mx-auto"
            />
            <p>Sélectionnez une doléance pour voir les détails</p>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <ClientOnly>
    <USlideover v-if="isMobile" v-model:open="isPropositionPanelOpen">
      <template #content>
        <PropositionDetail
          v-if="selectedProposition"
          :proposition="selectedProposition"
          @close="selectedProposition = null"
          @update="handleUpdate"
        />
      </template>
    </USlideover>
  </ClientOnly>
</template>
