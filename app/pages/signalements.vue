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
}, {
  label: 'Archivés',
  value: 'archive'
}]
const selectedTab = ref('all')
const viewMode = ref<'table' | 'map'>('table')

const { currentCommune } = useCurrentCommune()
const { session } = useSupabase()

const signalements = ref<Signalement[]>([])
const signalementsPending = ref(false)

async function fetchSignalements() {
  const token = session.value?.access_token
  if (!token) return
  signalementsPending.value = true
  try {
    const data = await $fetch<Signalement[]>('/api/signalements', {
      query: { commune_id: currentCommune.value?.id },
      headers: { Authorization: `Bearer ${token}` }
    })
    signalements.value = data ?? []
  } catch (e) {
    signalements.value = []
  } finally {
    signalementsPending.value = false
  }
}

watch([() => session.value?.access_token, currentCommune], () => {
  if (import.meta.client && session.value?.access_token) {
    fetchSignalements()
  }
}, { immediate: true })

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
  <UDashboardPanel id="signalements">
    <template #header>
      <UDashboardNavbar title="Signalements">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationBell />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Contrôles (boutons viewMode et tabs) -->
      <div class="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-default">
        <div class="flex items-center gap-2">
          <UFieldGroup>
            <UButton
              :variant="viewMode === 'table' ? 'solid' : 'outline'"
              icon="i-lucide-list"
              size="xs"
              @click="viewMode = 'table'"
            />
            <UButton
              :variant="viewMode === 'map' ? 'solid' : 'outline'"
              icon="i-lucide-map"
              size="xs"
              @click="viewMode = 'map'"
            />
          </UFieldGroup>
          <UTabs
            v-model="selectedTab"
            :items="tabItems"
            :content="false"
            size="xs"
          />
        </div>
        <UBadge :label="filteredSignalements.length" variant="subtle" />
      </div>

      <!-- Contenu principal : liste + détail en deux colonnes sur desktop -->
      <div class="flex gap-4 h-[calc(100vh-12rem)]">
        <!-- Colonne gauche : Liste ou Carte (plus étroite) -->
        <div class="w-1/3 min-w-[300px] max-w-[400px]">
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
        </div>

        <!-- Colonne droite : Détail du signalement (plus large) -->
        <div v-if="selectedSignalement" class="hidden lg:block flex-1 min-w-0">
          <SignalementDetail
            :signalement="selectedSignalement"
            @close="selectedSignalement = null"
            @update="handleUpdate"
          />
        </div>
        <div v-else class="hidden lg:flex flex-1 items-center justify-center">
          <UIcon name="i-lucide-alert-triangle" class="size-32 text-dimmed" />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Slideover pour mobile -->
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
