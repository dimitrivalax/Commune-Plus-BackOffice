<script setup lang="ts">
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, isSameMonth, isWithinInterval, parseISO, getHours, getMinutes, setHours, setMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ReservationSalle, Salle } from '~/types'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const toast = useToast()
const { session } = useSupabase()

const authHeaders = computed(() => {
  const currentSession = session.value
  if (!currentSession?.access_token) {
    return {}
  }
  return {
    Authorization: `Bearer ${currentSession.access_token}`
  }
})

const { getAuthHeaders } = useApiAuth()

type ViewType = 'day' | 'week' | 'month'

const currentView = ref<ViewType>('week')
const currentDate = ref(new Date())

const { currentCommune } = useCurrentCommune()

const isReservationsMobileDisabled = computed(
  () => currentCommune.value?.feature_reservations_salles === false,
)

// Charger les salles
const { data: salles, refresh: refreshSalles } = await useFetch<Salle[]>('/api/salles', {
  lazy: true,
  headers: authHeaders,
  query: computed(() => ({
    commune_id: currentCommune.value?.id
  }))
})

// Rafraîchir quand la commune change
watch(currentCommune, () => {
  refreshSalles()
  refreshReservations()
})

// Calculer la plage de dates selon la vue
const dateRange = computed(() => {
  switch (currentView.value) {
    case 'day':
      return {
        start: currentDate.value,
        end: currentDate.value
      }
    case 'week':
      return {
        start: startOfWeek(currentDate.value, { locale: fr }),
        end: endOfWeek(currentDate.value, { locale: fr })
      }
    case 'month':
      return {
        start: startOfMonth(currentDate.value),
        end: endOfMonth(currentDate.value)
      }
  }
})

// Charger les réservations pour la période
const { data: reservations, status, refresh: refreshReservations } = await useFetch<ReservationSalle[]>('/api/reservations-salles', {
  lazy: true,
  headers: authHeaders,
  query: computed(() => ({
    date_debut: dateRange.value.start.toISOString(),
    date_fin: dateRange.value.end.toISOString(),
    commune_id: currentCommune.value?.id
  }))
})

provide('refresh-reservations-salles', refreshReservations)

const selectedReservation = ref<ReservationSalle | null>(null)
const editModal = useTemplateRef<{ openModal: () => void }>('editModal')
const deleteModal = useTemplateRef<{ openModal: () => void }>('deleteModal')
const addModal = useTemplateRef<{ openModal: () => void }>('addModal')

// Filtrer les réservations pour la période affichée
const filteredReservations = computed(() => {
  if (!reservations.value) return []
  return reservations.value.filter((res) => {
    const resStart = parseISO(res.date_debut)
    const resEnd = parseISO(res.date_fin)
    return isWithinInterval(resStart, dateRange.value)
      || isWithinInterval(resEnd, dateRange.value)
      || (resStart <= dateRange.value.start && resEnd >= dateRange.value.end)
  })
})

// Grouper les réservations par salle
const reservationsBySalle = computed(() => {
  const grouped: Record<string, ReservationSalle[]> = {}
  filteredReservations.value.forEach((res) => {
    const salleId = res.salle_id
    if (!grouped[salleId]) {
      grouped[salleId] = []
    }
    grouped[salleId].push(res)
  })
  return grouped
})

// Obtenir les jours à afficher selon la vue
const daysToShow = computed(() => {
  switch (currentView.value) {
    case 'day':
      return [currentDate.value]
    case 'week':
      return eachDayOfInterval({
        start: dateRange.value.start,
        end: dateRange.value.end
      })
    case 'month':
      // Pour la vue mois, afficher toutes les semaines du mois
      const monthStart = startOfMonth(currentDate.value)
      const monthEnd = endOfMonth(currentDate.value)
      const weekStart = startOfWeek(monthStart, { locale: fr })
      const weekEnd = endOfWeek(monthEnd, { locale: fr })
      return eachDayOfInterval({
        start: weekStart,
        end: weekEnd
      })
  }
})

// Obtenir les semaines pour la vue mois
const weeksInMonth = computed(() => {
  if (currentView.value !== 'month') return []
  const days = daysToShow.value
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
})

// Obtenir les heures de la journée (de 8h à 22h)
const hours = computed(() => {
  const h: number[] = []
  for (let i = 8; i <= 22; i++) {
    h.push(i)
  }
  return h
})

// Fonctions de navigation
function goToToday() {
  currentDate.value = new Date()
}

function goToPrevious() {
  switch (currentView.value) {
    case 'day':
      currentDate.value = subDays(currentDate.value, 1)
      break
    case 'week':
      currentDate.value = subWeeks(currentDate.value, 1)
      break
    case 'month':
      currentDate.value = subMonths(currentDate.value, 1)
      break
  }
}

function goToNext() {
  switch (currentView.value) {
    case 'day':
      currentDate.value = addDays(currentDate.value, 1)
      break
    case 'week':
      currentDate.value = addWeeks(currentDate.value, 1)
      break
    case 'month':
      currentDate.value = addMonths(currentDate.value, 1)
      break
  }
}

// Obtenir les réservations pour une salle et un jour donnés
function getReservationsForSalleAndDay(salleId: string, day: Date): ReservationSalle[] {
  return filteredReservations.value.filter((res) => {
    if (res.salle_id !== salleId) return false
    const resStart = parseISO(res.date_debut)
    const resEnd = parseISO(res.date_fin)
    return isSameDay(resStart, day) || isSameDay(resEnd, day)
      || (resStart <= day && resEnd >= day)
  })
}

// Calculer la position et la hauteur d'une réservation dans la vue jour/semaine
function getReservationStatusClasses(reservation: ReservationSalle): string {
  switch (reservation.status) {
    case 'confirmée':
      return 'bg-success/20 border-success hover:bg-success/35'
    case 'refusée':
      return 'bg-error/20 border-error hover:bg-error/35'
    case 'en_attente':
    default:
      return 'bg-warning/20 border-warning hover:bg-warning/35'
  }
}

function getReservationStyle(reservation: ReservationSalle, day: Date) {
  const start = parseISO(reservation.date_debut)
  const end = parseISO(reservation.date_fin)

  // Si la réservation ne concerne pas ce jour, ne pas l'afficher
  if (!isSameDay(start, day) && !isSameDay(end, day) && !(start <= day && end >= day)) {
    return { display: 'none' }
  }

  const dayStart = setHours(day, 8)
  const dayEnd = setHours(day, 23)

  const actualStart = start < dayStart ? dayStart : start
  const actualEnd = end > dayEnd ? dayEnd : end

  const startMinutes = getHours(actualStart) * 60 + getMinutes(actualStart)
  const endMinutes = getHours(actualEnd) * 60 + getMinutes(actualEnd)
  const dayStartMinutes = 8 * 60 // 8h
  const dayDuration = 15 * 60 // 15 heures (8h-23h)

  const top = ((startMinutes - dayStartMinutes) / dayDuration) * 100
  const height = ((endMinutes - startMinutes) / dayDuration) * 100

  return {
    top: `${top}%`,
    height: `${height}%`
  }
}

function handleReservationClick(reservation: ReservationSalle) {
  selectedReservation.value = reservation
  editModal.value?.openModal()
}

function handleDelete(reservation: ReservationSalle) {
  selectedReservation.value = reservation
  deleteModal.value?.openModal()
}

const addModalProps = ref<{
  salleId?: string
  dateDebut?: Date
  dateFin?: Date
}>({})

function handleSlotClick(salleId: string, day: Date, hour: number) {
  const startDate = setHours(setMinutes(day, 0), hour)
  const endDate = setHours(setMinutes(day, 30), hour)
  addModalProps.value = {
    salleId,
    dateDebut: startDate,
    dateFin: endDate
  }
  addModal.value?.openModal()
}
</script>

<template>
  <UDashboardPanel id="reservations-salles">
    <template #header>
      <UDashboardNavbar title="Planning des réservations">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              :variant="currentView === 'day' ? 'solid' : 'subtle'"
              color="primary"
              label="Jour"
              @click="currentView = 'day'"
            />
            <UButton
              :variant="currentView === 'week' ? 'solid' : 'subtle'"
              color="primary"
              label="Semaine"
              @click="currentView = 'week'"
            />
            <UButton
              :variant="currentView === 'month' ? 'solid' : 'subtle'"
              color="primary"
              label="Mois"
              @click="currentView = 'month'"
            />
            <ReservationsSallesAddModal
              ref="addModal"
              :salle-id="addModalProps.salleId"
              :date-debut="addModalProps.dateDebut"
              :date-fin="addModalProps.dateFin"
            />
            <NotificationBell />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <CommuneMobileFeatureDisabledBanner
        v-if="isReservationsMobileDisabled"
        feature="reservations"
      />

      <!-- Navigation -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            @click="goToPrevious"
          />
          <UButton
            label="Aujourd'hui"
            color="neutral"
            variant="subtle"
            @click="goToToday"
          />
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            @click="goToNext"
          />
          <h2 class="text-lg font-semibold ml-4">
            {{ currentView === 'day'
              ? format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })
              : currentView === 'week'
                ? `Semaine du ${format(dateRange.start, 'd MMMM', { locale: fr })}`
                : format(currentDate, 'MMMM yyyy', { locale: fr })
            }}
          </h2>
        </div>
      </div>

      <!-- Vue Jour -->
      <div v-if="currentView === 'day'" class="overflow-x-auto">
        <div v-if="status === 'pending'" class="text-center py-8">
          <p class="text-muted">
            Chargement...
          </p>
        </div>
        <div v-else-if="!salles || salles.length === 0" class="text-center py-8">
          <p class="text-muted">
            Aucune salle disponible
          </p>
        </div>
        <div v-else class="border border-default rounded-lg">
          <div class="grid" :style="{ gridTemplateColumns: `200px repeat(${salles.length}, 1fr)` }">
            <!-- En-tête heures -->
            <div class="border-r border-b border-default p-2 bg-elevated/50 font-medium">
              Heures
            </div>
            <div
              v-for="salle in salles"
              :key="salle.id"
              class="border-b border-default p-2 bg-elevated/50 font-medium text-center"
            >
              {{ salle.nom }}
            </div>

            <!-- Lignes d'heures -->
            <template v-for="hour in hours" :key="hour">
              <div class="border-r border-b border-default p-2 text-sm text-muted">
                {{ hour }}h
              </div>
              <div
                v-for="salle in salles"
                :key="`${salle.id}-${hour}`"
                class="border-b border-default relative min-h-[60px]"
                @click="handleSlotClick(salle.id, currentDate, hour)"
              >
                <div
                  v-for="reservation in getReservationsForSalleAndDay(salle.id, currentDate)"
                  :key="reservation.id"
                  :style="getReservationStyle(reservation, currentDate)"
                  class="absolute left-0 right-0 mx-1 border rounded p-1 text-xs cursor-pointer z-10"
                  :class="getReservationStatusClasses(reservation)"
                  @click.stop="handleReservationClick(reservation)"
                >
                  <div class="font-medium">
                    {{ reservation.prenom }} {{ reservation.nom }}
                  </div>
                  <div class="text-xs text-muted">
                    {{ format(parseISO(reservation.date_debut), 'HH:mm') }} -
                    {{ format(parseISO(reservation.date_fin), 'HH:mm') }}
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Vue Semaine -->
      <div v-if="currentView === 'week'" class="overflow-x-auto">
        <div v-if="status === 'pending'" class="text-center py-8">
          <p class="text-muted">
            Chargement...
          </p>
        </div>
        <div v-else-if="!salles || salles.length === 0" class="text-center py-8">
          <p class="text-muted">
            Aucune salle disponible
          </p>
        </div>
        <div v-else class="border border-default rounded-lg">
          <div class="grid" :style="{ gridTemplateColumns: `200px repeat(${daysToShow.length}, 1fr)` }">
            <!-- En-tête -->
            <div class="border-r border-b border-default p-2 bg-elevated/50 font-medium">
              Salles
            </div>
            <div
              v-for="day in daysToShow"
              :key="day.toString()"
              class="border-b border-default p-2 bg-elevated/50 font-medium text-center"
            >
              <div>{{ format(day, 'EEEE', { locale: fr }) }}</div>
              <div class="text-sm text-muted">
                {{ format(day, 'd MMM', { locale: fr }) }}
              </div>
            </div>

            <!-- Lignes de salles -->
            <template v-for="salle in salles" :key="salle.id">
              <div class="border-r border-b border-default p-2 font-medium">
                {{ salle.nom }}
              </div>
              <div
                v-for="day in daysToShow"
                :key="`${salle.id}-${day.toString()}`"
                class="border-b border-default p-2 min-h-[100px] relative"
              >
                <div
                  v-for="reservation in getReservationsForSalleAndDay(salle.id, day)"
                  :key="reservation.id"
                  class="mb-1 p-2 border rounded text-xs cursor-pointer"
                  :class="getReservationStatusClasses(reservation)"
                  @click="handleReservationClick(reservation)"
                >
                  <div class="font-medium">
                    {{ reservation.prenom }} {{ reservation.nom }}
                  </div>
                  <div class="text-xs text-muted">
                    {{ format(parseISO(reservation.date_debut), 'HH:mm') }} -
                    {{ format(parseISO(reservation.date_fin), 'HH:mm') }}
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Vue Mois -->
      <div v-if="currentView === 'month'" class="overflow-x-auto">
        <div v-if="status === 'pending'" class="text-center py-8">
          <p class="text-muted">
            Chargement...
          </p>
        </div>
        <div v-else-if="!salles || salles.length === 0" class="text-center py-8">
          <p class="text-muted">
            Aucune salle disponible
          </p>
        </div>
        <div v-else class="space-y-4">
          <template v-for="salle in salles" :key="salle.id">
            <div class="border border-default rounded-lg">
              <div class="p-2 bg-elevated/50 font-medium border-b border-default">
                {{ salle.nom }}
              </div>
              <!-- En-tête des jours de la semaine -->
              <div class="grid" :style="{ gridTemplateColumns: `repeat(7, 1fr)` }">
                <div
                  v-for="day in daysToShow.slice(0, 7)"
                  :key="day.toString()"
                  class="p-2 bg-elevated/30 font-medium text-center border-r border-b border-default last:border-r-0"
                >
                  {{ format(day, 'EEE', { locale: fr }) }}
                </div>
              </div>
              <!-- Semaines du mois -->
              <template v-for="(week, weekIndex) in weeksInMonth" :key="weekIndex">
                <div class="grid" :style="{ gridTemplateColumns: `repeat(7, 1fr)` }">
                  <div
                    v-for="day in week"
                    :key="day.toString()"
                    class="p-1 min-h-[100px] border-r border-b border-default last:border-r-0"
                    :class="{ 'bg-muted/20': !isSameMonth(day, currentDate) }"
                  >
                    <div class="text-xs text-muted mb-1" :class="{ 'font-bold text-primary': isSameDay(day, new Date()) }">
                      {{ format(day, 'd') }}
                    </div>
                    <div
                      v-for="reservation in getReservationsForSalleAndDay(salle.id, day)"
                      :key="reservation.id"
                      class="mb-1 p-1 border rounded text-xs cursor-pointer"
                      :class="getReservationStatusClasses(reservation)"
                      @click="handleReservationClick(reservation)"
                    >
                      <div class="font-medium truncate">
                        {{ reservation.prenom }} {{ reservation.nom }}
                      </div>
                      <div class="text-xs text-muted">
                        {{ format(parseISO(reservation.date_debut), 'HH:mm') }}
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <ReservationsSallesEditModal
    ref="editModal"
    :reservation="selectedReservation"
    @delete="handleDelete"
  />
  <ReservationsSallesDeleteModal ref="deleteModal" :reservation="selectedReservation" />
</template>
