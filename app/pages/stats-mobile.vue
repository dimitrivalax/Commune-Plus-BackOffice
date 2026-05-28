<script setup lang="ts">
const period = ref<'7d' | '30d' | 'custom'>('30d')
const customStart = ref('')
const customEnd = ref('')
const selectedCommuneId = ref('')

const periodItems = [
  { label: '7 derniers jours', value: '7d' },
  { label: '30 derniers jours', value: '30d' },
  { label: 'Personnalisee', value: 'custom' }
]

const { currentCommune, userCommunes } = useCurrentCommune()
const { isAdministrator } = useCurrentUser()

watch(
  () => currentCommune.value?.id,
  (id) => {
    if (!selectedCommuneId.value && id) {
      selectedCommuneId.value = id
    }
  },
  { immediate: true }
)

const communeItems = computed(() =>
  (userCommunes.value || []).map(c => ({
    label: `${c.name} (${c.postal_code})`,
    value: c.id
  }))
)

const { data, status, error } = await useStatsMobileData(period, selectedCommuneId, customStart, customEnd)

const kpis = computed(() => data.value?.kpis)
const topActualites = computed(() => data.value?.top_actualites || [])
const topPropositions = computed(() => data.value?.top_propositions || [])

const isLoading = computed(() => status.value === 'pending')
</script>

<template>
  <UDashboardPanel id="stats-mobile">
    <template #header>
      <UDashboardNavbar title="Statistiques mobile">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-4">
        <UAlert
          color="info"
          variant="soft"
          title="Donnees mobile anonymisees"
          description="Cette page affiche uniquement les interactions iOS/Android sans donnees personnelles utilisateur."
        />

        <UAlert
          v-if="isLoading"
          color="primary"
          variant="soft"
          title="Chargement des statistiques"
          description="Recuperation des donnees en cours..."
        >
          <template #description>
            <div class="space-y-2">
              <p>Recuperation des donnees en cours...</p>
              <UProgress animation="carousel" />
            </div>
          </template>
        </UAlert>

        <div class="grid gap-3 md:grid-cols-4">
          <UFormField v-if="isAdministrator" label="Commune">
            <USelect
              v-model="selectedCommuneId"
              :items="communeItems"
              placeholder="Toutes les communes"
            />
          </UFormField>

          <UFormField label="Periode">
            <USelect v-model="period" :items="periodItems" />
          </UFormField>

          <UFormField v-if="period === 'custom'" label="Debut">
            <UInput v-model="customStart" type="date" />
          </UFormField>

          <UFormField v-if="period === 'custom'" label="Fin">
            <UInput v-model="customEnd" type="date" />
          </UFormField>
        </div>

        <div class="grid gap-3 md:grid-cols-4">
          <UCard>
            <template #header>
              Utilisateurs mobiles connectes
            </template>
            <div class="text-2xl font-semibold">
              {{ kpis?.connected_users_count ?? 0 }}
            </div>
          </UCard>
          <UCard>
            <template #header>
              Vues uniques actualites
            </template>
            <div class="text-2xl font-semibold">
              {{ kpis?.unique_actualites_views ?? 0 }}
            </div>
          </UCard>
          <UCard>
            <template #header>
              Vues uniques propositions
            </template>
            <div class="text-2xl font-semibold">
              {{ kpis?.unique_propositions_views ?? 0 }}
            </div>
          </UCard>
          <UCard>
            <template #header>
              Signalements crees
            </template>
            <div class="text-2xl font-semibold">
              {{ kpis?.signalements_count ?? 0 }}
            </div>
          </UCard>
        </div>

        <div class="grid gap-3 md:grid-cols-1">
          <UCard>
            <template #header>
              Top actualites (vues uniques)
            </template>
            <ul v-if="topActualites.length > 0" class="space-y-2">
              <li
                v-for="item in topActualites"
                :key="item.id"
                class="flex items-center justify-between text-sm"
              >
                <span class="truncate pr-3">{{ item.title }}</span>
                <UBadge color="primary" variant="soft">
                  {{ item.unique_views }}
                </UBadge>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">
              Aucune donnee.
            </p>
          </UCard>
        </div>
        <div class="grid gap-3 md:grid-cols-1">
          <UCard>
            <template #header>
              Top propositions (vues uniques)
            </template>
            <ul v-if="topPropositions.length > 0" class="space-y-2">
              <li
                v-for="item in topPropositions"
                :key="item.id"
                class="flex items-center justify-between text-sm"
              >
                <span class="truncate pr-3">{{ item.title }}</span>
                <UBadge color="primary" variant="soft">
                  {{ item.unique_views }}
                </UBadge>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">
              Aucune donnee.
            </p>
          </UCard>
        </div>

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          title="Erreur de chargement"
          :description="String(error.message || 'Impossible de charger les statistiques')"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
