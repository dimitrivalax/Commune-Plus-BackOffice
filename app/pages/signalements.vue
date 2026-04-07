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
const searchQuery = ref('')

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

function signalementMatchesSearch(s: Signalement, q: string) {
  if (!q)
    return true
  const needle = q.toLowerCase()
  const hay = [
    s.description,
    s.address,
    s.comment,
    s.last_name,
    s.first_name,
    s.email,
    s.phone,
    s.reponse
  ]
  return hay.some(v => (v ?? '').toLowerCase().includes(needle))
}

// Filter by tab, then by search (description, address, comment, names, email, phone, réponse)
const filteredSignalements = computed(() => {
  let list = selectedTab.value === 'all'
    ? signalements.value
    : signalements.value.filter(s => s.status === selectedTab.value)

  const q = searchQuery.value.trim()
  if (q) {
    list = list.filter(s => signalementMatchesSearch(s, q))
  }
  return list
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
      <div class="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 mb-4 pb-4 border-b border-default items-center">
        <div class="flex items-center gap-2 flex-wrap min-w-0 w-max max-w-full">
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
            :ui="{ root: 'w-max max-w-full', list: '!w-max max-w-full', trigger: 'grow-0' }"
          />
        </div>
        <div class="flex items-center gap-3 justify-end min-w-0">
          <UInput
            v-model="searchQuery"
            class="w-full min-w-48 max-w-sm"
            icon="i-lucide-search"
            placeholder="Rechercher (description, adresse, contact, réponse...)"
          />
          <UBadge
            class="shrink-0"
            :label="filteredSignalements.length"
            variant="subtle"
          />
        </div>
      </div>

      <!-- Contenu principal : liste + détail en deux colonnes sur desktop -->
      <div class="flex gap-4 h-[calc(100vh-12rem)] min-h-0">
        <!-- Colonne gauche : Liste ou Carte (plus étroite) -->
        <div class="w-1/3 min-w-[300px] max-w-[400px] h-full overflow-hidden">
          <div
            v-if="viewMode === 'table'"
            class="h-full border border-default rounded-lg overflow-hidden bg-default/10"
          >
            <SignalementsList
              v-model="selectedSignalement"
              :signalements="filteredSignalements"
            />
            <div v-if="signalementsPending" class="p-4 text-center">
              <UIcon name="i-lucide-loader-2" class="animate-spin" />
            </div>
            <div
              v-else-if="filteredSignalements.length === 0"
              class="p-8 text-center text-dimmed italic text-sm"
            >
              Aucun signalement trouvé.
            </div>
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
        <div v-if="selectedSignalement" class="hidden lg:block flex-1 min-w-0 min-h-0 h-full overflow-hidden">
          <SignalementDetail
            :signalement="selectedSignalement"
            @close="selectedSignalement = null"
            @update="handleUpdate"
          />
        </div>
        <div
          v-else
          class="hidden lg:flex flex-1 items-center justify-center border border-default rounded-lg bg-default/5"
        >
          <div class="text-center text-dimmed">
            <UIcon
              name="i-lucide-alert-triangle"
              class="size-24 mb-4 opacity-20 mx-auto"
            />
            <p>Sélectionnez un signalement pour voir les détails</p>
          </div>
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
