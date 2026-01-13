<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { breakpointsTailwind } from '@vueuse/core'
import type { Signalement } from '~/types'
import SignalementsList from '~/components/signalements/SignalementsList.vue'
import SignalementsMap from '~/components/signalements/SignalementsMap.vue'
import SignalementDetail from '~/components/signalements/SignalementDetail.vue'

const tabItems = [{
  label: 'Tous',
  value: 'all'
}, {
  label: 'En Attente',
  value: 'en_attente'
}, {
  label: 'En cours',
  value: 'en_cours'
}, {
  label: 'Traités',
  value: 'traite'
}]
const selectedTab = ref('all')
const viewMode = ref<'table' | 'map'>('table')

const { currentCommune } = useCurrentCommune()

const { data: signalements, refresh: refreshSignalements } = await useFetch<Signalement[]>('/api/signalements', {
  default: () => [],
  query: computed(() => ({
    commune_id: currentCommune.value?.id
  }))
})

// Rafraîchir quand la commune change
watch(currentCommune, () => {
  refreshSignalements()
})

// Filter signalements based on the selected tab
const filteredSignalements = computed(() => {
  if (selectedTab.value === 'all') {
    return signalements.value
  }

  return signalements.value.filter(s => s.status === selectedTab.value)
})

const selectedSignalement = ref<Signalement | null>()

const isSignalementPanelOpen = computed({
  get() {
    return !!selectedSignalement.value
  },
  set(value: boolean) {
    if (!value) {
      selectedSignalement.value = null
    }
  }
})

// Reset selected signalement if it's not in the filtered signalements
watch(filteredSignalements, () => {
  if (!filteredSignalements.value.find(s => s.id === selectedSignalement.value?.id)) {
    selectedSignalement.value = null
  }
})

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')

const handleUpdate = (updated: Signalement) => {
  const index = signalements.value.findIndex((s: Signalement) => s.id === updated.id)
  if (index !== -1) {
    signalements.value[index] = updated
  }
  if (selectedSignalement.value && selectedSignalement.value.id === updated.id) {
    selectedSignalement.value = updated
  }
}

const handleMarkerClick = (signalement: Signalement) => {
  selectedSignalement.value = signalement
}
</script>

<template>
  <UDashboardPanel id="signalements-1" :default-size="25" :min-size="20" :max-size="30" resizable>
    <UDashboardNavbar title="Signalements">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #trailing>
        <UBadge :label="filteredSignalements.length" variant="subtle" />
      </template>

      <template #right>
        <div class="flex items-center gap-2">
          <UFieldGroup>
            <UButton :variant="viewMode === 'table' ? 'solid' : 'outline'" icon="i-lucide-list"
              @click="viewMode = 'table'" size="xs" />
            <UButton :variant="viewMode === 'map' ? 'solid' : 'outline'" icon="i-lucide-map" @click="viewMode = 'map'"
              size="xs" />
          </UFieldGroup>
          <UTabs v-model="selectedTab" :items="tabItems" :content="false" size="xs" />
        </div>
      </template>
    </UDashboardNavbar>
    <div v-if="viewMode === 'table'" class="h-full">
      <SignalementsList v-model="selectedSignalement" :signalements="filteredSignalements" />
    </div>
    <div v-else class="h-full">
      <ClientOnly>
        <SignalementsMap :signalements="filteredSignalements" @marker-click="handleMarkerClick" />
        <template #fallback>
          <div class="flex items-center justify-center h-full">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-dimmed" />
          </div>
        </template>
      </ClientOnly>
    </div>
  </UDashboardPanel>

  <SignalementDetail v-if="selectedSignalement" :signalement="selectedSignalement" @close="selectedSignalement = null"
    @update="handleUpdate" />
  <div v-else class="hidden lg:flex flex-1 items-center justify-center">
    <UIcon name="i-lucide-alert-triangle" class="size-32 text-dimmed" />
  </div>

  <ClientOnly>
    <USlideover v-if="isMobile" v-model:open="isSignalementPanelOpen">
      <template #content>
        <SignalementDetail v-if="selectedSignalement" :signalement="selectedSignalement"
          @close="selectedSignalement = null" @update="handleUpdate" />
      </template>
    </USlideover>
  </ClientOnly>
</template>
