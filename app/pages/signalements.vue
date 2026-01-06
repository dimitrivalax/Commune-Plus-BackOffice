<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { breakpointsTailwind } from '@vueuse/core'
import type { Signalement } from '~/types'
import SignalementsList from '~/components/signalements/SignalementsList.vue'
import SignalementDetail from '~/components/signalements/SignalementDetail.vue'

const tabItems = [{
  label: 'Tous',
  value: 'all'
}, {
  label: 'En attente',
  value: 'en_attente'
}, {
  label: 'En cours',
  value: 'en_cours'
}, {
  label: 'Traités',
  value: 'traité'
}]
const selectedTab = ref('all')

const { data: signalements } = await useFetch<Signalement[]>('/api/signalements', { default: () => [] })

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
</script>

<template>
  <UDashboardPanel
    id="signalements-1"
    :default-size="25"
    :min-size="20"
    :max-size="30"
    resizable
  >
    <UDashboardNavbar title="Signalements">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #trailing>
        <UBadge :label="filteredSignalements.length" variant="subtle" />
      </template>

      <template #right>
        <UTabs
          v-model="selectedTab"
          :items="tabItems"
          :content="false"
          size="xs"
        />
      </template>
    </UDashboardNavbar>
    <SignalementsList v-model="selectedSignalement" :signalements="filteredSignalements" />
  </UDashboardPanel>

  <SignalementDetail
    v-if="selectedSignalement"
    :signalement="selectedSignalement"
    @close="selectedSignalement = null"
    @update="handleUpdate"
  />
  <div v-else class="hidden lg:flex flex-1 items-center justify-center">
    <UIcon name="i-lucide-alert-triangle" class="size-32 text-dimmed" />
  </div>

  <ClientOnly>
    <USlideover v-if="isMobile" v-model:open="isSignalementPanelOpen">
      <template #content>
        <SignalementDetail
          v-if="selectedSignalement"
          :signalement="selectedSignalement"
          @close="selectedSignalement = null"
          @update="handleUpdate"
        />
      </template>
    </USlideover>
  </ClientOnly>
</template>
