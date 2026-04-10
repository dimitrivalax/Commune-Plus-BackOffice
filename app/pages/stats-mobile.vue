<script setup lang="ts">
type TopItem = {
  id: string
  title: string
  unique_views: number
}

type NotificationPerfItem = {
  notification_id: string
  target_type: string
  target_id: string
  target_title: string
  sent_total: number
  unique_clicks: number
  ctr_percent: number
}

type StatsResponse = {
  filters: {
    commune_id: string | null
    period: string
    start: string
    end: string
    mobile_only: boolean
  }
  kpis: {
    unique_actualites_views: number
    unique_propositions_views: number
    signalements_count: number
    unique_notification_clicks: number
  }
  top_actualites: TopItem[]
  top_propositions: TopItem[]
  notifications_performance: NotificationPerfItem[]
}

const period = ref<'7d' | '30d' | 'custom'>('30d')
const customStart = ref('')
const customEnd = ref('')
const selectedCommuneId = ref('')

const periodItems = [
  { label: '7 derniers jours', value: '7d' },
  { label: '30 derniers jours', value: '30d' },
  { label: 'Personnalisee', value: 'custom' },
]

const { session } = useSupabase()
const { currentCommune, userCommunes } = useCurrentCommune()
const { isAdministrator } = useCurrentUser()

watch(
  () => currentCommune.value?.id,
  (id) => {
    if (!selectedCommuneId.value && id) {
      selectedCommuneId.value = id
    }
  },
  { immediate: true },
)

const communeItems = computed(() =>
  (userCommunes.value || []).map((c) => ({
    label: `${c.name} (${c.postal_code})`,
    value: c.id,
  })),
)

const authHeaders = computed<Record<string, string> | undefined>(() => {
  const token = session.value?.access_token
  return token ? { Authorization: `Bearer ${token}` } : undefined
})

const queryParams = computed(() => {
  const query: Record<string, string> = {
    period: period.value,
  }
  if (selectedCommuneId.value) {
    query.commune_id = selectedCommuneId.value
  }
  if (period.value === 'custom') {
    if (customStart.value) query.start = customStart.value
    if (customEnd.value) query.end = customEnd.value
  }
  return query
})

const { data, status, refresh, error } = await useFetch<StatsResponse>(
  '/api/stats/mobile',
  {
    lazy: true,
    headers: authHeaders,
    query: queryParams,
  },
)

watch([period, selectedCommuneId, customStart, customEnd], () => {
  if (
    period.value !== 'custom'
    || (period.value === 'custom' && customStart.value && customEnd.value)
  ) {
    refresh()
  }
})

const kpis = computed(() => data.value?.kpis)
const topActualites = computed(() => data.value?.top_actualites || [])
const topPropositions = computed(() => data.value?.top_propositions || [])
const notificationPerformance = computed(
  () => data.value?.notifications_performance || [],
)
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
            <template #header>Vues uniques actualites</template>
            <div class="text-2xl font-semibold">
              {{ kpis?.unique_actualites_views ?? 0 }}
            </div>
          </UCard>
          <UCard>
            <template #header>Vues uniques propositions</template>
            <div class="text-2xl font-semibold">
              {{ kpis?.unique_propositions_views ?? 0 }}
            </div>
          </UCard>
          <UCard>
            <template #header>Signalements crees</template>
            <div class="text-2xl font-semibold">
              {{ kpis?.signalements_count ?? 0 }}
            </div>
          </UCard>
          <UCard>
            <template #header>Clics uniques notifications</template>
            <div class="text-2xl font-semibold">
              {{ kpis?.unique_notification_clicks ?? 0 }}
            </div>
          </UCard>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <UCard>
            <template #header>Top actualites (vues uniques)</template>
            <ul v-if="topActualites.length > 0" class="space-y-2">
              <li
                v-for="item in topActualites"
                :key="item.id"
                class="flex items-center justify-between text-sm"
              >
                <span class="truncate pr-3">{{ item.title }}</span>
                <UBadge color="primary" variant="soft">{{ item.unique_views }}</UBadge>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">Aucune donnee.</p>
          </UCard>

          <UCard>
            <template #header>Top propositions (vues uniques)</template>
            <ul v-if="topPropositions.length > 0" class="space-y-2">
              <li
                v-for="item in topPropositions"
                :key="item.id"
                class="flex items-center justify-between text-sm"
              >
                <span class="truncate pr-3">{{ item.title }}</span>
                <UBadge color="primary" variant="soft">{{ item.unique_views }}</UBadge>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">Aucune donnee.</p>
          </UCard>
        </div>

        <UCard>
          <template #header>Performance des notifications</template>
          <UTable
            :data="notificationPerformance"
            :loading="status === 'pending'"
            :columns="[
              { accessorKey: 'target_type', header: 'Type' },
              { accessorKey: 'target_title', header: 'Titre' },
              { accessorKey: 'sent_total', header: 'Envoyees' },
              { accessorKey: 'unique_clicks', header: 'Clics uniques' },
              { accessorKey: 'ctr_percent', header: 'Taux d\'ouverture (%)' }
            ]"
          />
        </UCard>

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
