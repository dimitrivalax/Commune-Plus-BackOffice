<script setup lang="ts">
import { format, parseISO, setHours, setMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ReservationSalle } from '~/types'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const {
  currentView,
  currentDate,
  selectedSalleIds,
  reservationStatusOptions,
  selectedReservationStatuses,
  addModalProps,
  isReservationsMobileDisabled,
  dateRange,
  salles,
  filteredReservations,
  displayedSalles,
  daysToShow,
  weeksInMonth,
  hours,
  status,
  vacancesResponse,
  refreshReservations,
  goToToday,
  goToPrevious,
  goToNext,
  getReservationsForSalleAndDay,
  getReservationsForDay,
  getSalleName,
  toggleSalleSelection,
  toggleReservationStatusSelection,
  getSalleColorClasses,
  getReservationStatusLabel,
  formatReservationDateTime,
  isDayInVacances,
  getVacancesDescriptionForDay
} = await useReservationsSallesPageState()

const {
  dayStartHour,
  dayEndHour,
  dayStartMinutes,
  dayEndMinutes,
  dayDurationMinutes,
  getDayAgendaReservationsForSalle: getDayAgendaReservationsForSalleRaw,
  getDayAgendaReservationStyle
} = useReservationsSallesCalendar()

provide('refresh-reservations-salles', refreshReservations)

const selectedReservation = ref<ReservationSalle | null>(null)
const editModal = useTemplateRef<{ openModal: () => void }>('editModal')
const deleteModal = useTemplateRef<{ openModal: () => void }>('deleteModal')
const addModal = useTemplateRef<{ openModal: () => void }>('addModal')
const printMode = ref<'view' | 'list'>('view')

type PrintSalleGroup = {
  salleId: string
  reservations: ReservationSalle[]
}

type PrintDateGroup = {
  dayKey: string
  dayDate: Date
  salles: PrintSalleGroup[]
}

const printDateLabel = computed(() => {
  if (currentView.value === 'day') {
    return format(currentDate.value, 'EEEE d MMMM yyyy', { locale: fr })
  }
  if (currentView.value === 'week') {
    return `Semaine du ${format(dateRange.value.start, 'd MMMM yyyy', { locale: fr })}`
  }
  return format(currentDate.value, 'MMMM yyyy', { locale: fr })
})

const selectedSallesLabel = computed(() => {
  if (!displayedSalles.value.length) {
    return 'Toutes les salles'
  }
  return displayedSalles.value.map(salle => salle.nom).join(', ')
})

const printListGroups = computed<PrintDateGroup[]>(() => {
  const groupedByDay = new Map<string, Map<string, ReservationSalle[]>>()

  for (const reservation of filteredReservations.value) {
    const dateDebut = parseISO(reservation.date_debut)
    const dayKey = format(dateDebut, 'yyyy-MM-dd')
    if (!groupedByDay.has(dayKey)) {
      groupedByDay.set(dayKey, new Map())
    }
    const dayMap = groupedByDay.get(dayKey)!
    if (!dayMap.has(reservation.salle_id)) {
      dayMap.set(reservation.salle_id, [])
    }
    dayMap.get(reservation.salle_id)!.push(reservation)
  }

  return [...groupedByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, sallesMap]) => ({
      dayKey,
      dayDate: parseISO(`${dayKey}T00:00:00`),
      salles: [...sallesMap.entries()]
        .map(([salleId, reservations]) => ({
          salleId,
          reservations: [...reservations].sort((a, b) => a.date_debut.localeCompare(b.date_debut))
        }))
        .sort((a, b) => getSalleName(a.salleId).localeCompare(getSalleName(b.salleId), 'fr'))
    }))
})

function getDayAgendaReservationsForSalle(salleId: string, day: Date) {
  return getDayAgendaReservationsForSalleRaw(filteredReservations.value, salleId, day)
}

function handleReservationClick(reservation: ReservationSalle) {
  selectedReservation.value = reservation
  const modal = editModal.value as {
    openModal?: () => void
    $?: { exposed?: { openModal?: () => void } }
  } | null
  if (typeof modal?.openModal === 'function') {
    modal.openModal()
    return
  }
  if (typeof modal?.$?.exposed?.openModal === 'function') {
    modal.$.exposed.openModal()
  }
}

function handleDelete(reservation: ReservationSalle) {
  selectedReservation.value = reservation
  deleteModal.value?.openModal()
}

function handleDayColumnClick(event: MouseEvent, salleId: string, day: Date) {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return

  const rect = target.getBoundingClientRect()
  if (rect.height <= 0) return

  const relativeY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height)
  const minutesFromStart = Math.floor((relativeY / rect.height) * dayDurationMinutes)
  const roundedMinutesFromStart = Math.floor(minutesFromStart / 30) * 30
  const absoluteMinutes = Math.min(dayStartMinutes + roundedMinutesFromStart, dayEndMinutes - 30)
  const hour = Math.floor(absoluteMinutes / 60)
  const minutes = absoluteMinutes % 60

  const startDate = setHours(setMinutes(day, minutes), hour)
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000)
  addModalProps.value = {
    salleId,
    dateDebut: startDate,
    dateFin: endDate
  }
  addModal.value?.openModal()
}

async function printPlanning(mode: 'view' | 'list') {
  printMode.value = mode
  await nextTick()
  if (import.meta.client) {
    window.print()
  }
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
            <UButton
              icon="i-lucide-printer"
              color="neutral"
              variant="subtle"
              label="Imprimer vue"
              @click="printPlanning('view')"
            />
            <UButton
              icon="i-lucide-file-text"
              color="neutral"
              variant="outline"
              label="Imprimer liste"
              @click="printPlanning('list')"
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
      <div :class="printMode === 'list' ? 'print-mode-list' : 'print-mode-view'">
        <CommuneMobileFeatureDisabledBanner
          v-if="isReservationsMobileDisabled"
          feature="reservations"
        />

        <div class="print-only print-header mb-4">
          <h1 class="text-xl font-bold">
            Planning des réservations de salles
          </h1>
          <p class="text-sm">
            Période: {{ printDateLabel }}
          </p>
          <p class="text-sm">
            Salles: {{ selectedSallesLabel }}
          </p>
          <p class="text-sm">
            Date d'impression: {{ format(new Date(), 'dd/MM/yyyy HH:mm') }}
          </p>
        </div>

        <div class="print-view-content">
          <div class="non-print-controls flex items-center justify-between mb-4">
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
            <UBadge
              v-if="vacancesResponse?.zone"
              color="neutral"
              variant="soft"
              :label="`Zone scolaire ${vacancesResponse.zone}`"
            />
          </div>

          <div v-if="salles?.length" class="non-print-salles mb-4 p-3 border border-default rounded-lg bg-elevated/20">
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div class="text-sm font-medium mb-2">
                  Salles affichées
                </div>
                <div class="flex flex-wrap gap-3">
                  <label
                    v-for="salle in salles"
                    :key="`filter-${salle.id}`"
                    class="flex items-center gap-2 text-sm"
                  >
                    <input
                      :checked="selectedSalleIds.includes(salle.id)"
                      type="checkbox"
                      class="rounded border-default"
                      @change="toggleSalleSelection(salle.id, ($event.target as HTMLInputElement).checked)"
                    >
                    <span
                      class="inline-flex items-center gap-2 px-2 py-1 border rounded"
                      :class="getSalleColorClasses(salle.id)"
                    >
                      {{ salle.nom }}
                    </span>
                  </label>
                </div>
              </div>

              <div class="md:ml-4">
                <div class="text-sm font-medium mb-2">
                  Statuts
                </div>
                <div class="flex flex-wrap gap-3">
                  <label
                    v-for="statusValue in reservationStatusOptions"
                    :key="`status-filter-${statusValue}`"
                    class="flex items-center gap-2 text-sm"
                  >
                    <input
                      :checked="selectedReservationStatuses.includes(statusValue)"
                      type="checkbox"
                      class="rounded border-default"
                      @change="toggleReservationStatusSelection(statusValue, ($event.target as HTMLInputElement).checked)"
                    >
                    <span class="inline-flex items-center gap-2 px-2 py-1 border border-default rounded">
                      {{ getReservationStatusLabel(statusValue) }}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <ReservationsSallesViewsDayView
            v-if="currentView === 'day'"
            :current-date="currentDate"
            :status="status"
            :salles="salles"
            :displayed-salles="displayedSalles"
            :hours="hours"
            :day-start-hour="dayStartHour"
            :day-end-hour="dayEndHour"
            :is-day-in-vacances="isDayInVacances"
            :get-vacances-description-for-day="getVacancesDescriptionForDay"
            :get-day-agenda-reservations-for-salle="getDayAgendaReservationsForSalle"
            :get-day-agenda-reservation-style="getDayAgendaReservationStyle"
            :get-salle-color-classes="getSalleColorClasses"
            :get-salle-name="getSalleName"
            :format-reservation-date-time="formatReservationDateTime"
            :get-reservation-status-label="getReservationStatusLabel"
            @reservation-click="handleReservationClick"
            @day-column-click="handleDayColumnClick"
          />

          <ReservationsSallesViewsWeekView
            v-if="currentView === 'week'"
            :status="status"
            :salles="salles"
            :displayed-salles="displayedSalles"
            :days-to-show="daysToShow"
            :is-day-in-vacances="isDayInVacances"
            :get-reservations-for-salle-and-day="getReservationsForSalleAndDay"
            :get-salle-color-classes="getSalleColorClasses"
            :get-salle-name="getSalleName"
            :format-reservation-date-time="formatReservationDateTime"
            :get-reservation-status-label="getReservationStatusLabel"
            @reservation-click="handleReservationClick"
          />

          <ReservationsSallesViewsMonthView
            v-if="currentView === 'month'"
            :current-date="currentDate"
            :status="status"
            :salles="salles"
            :displayed-salles="displayedSalles"
            :days-to-show="daysToShow"
            :weeks-in-month="weeksInMonth"
            :is-day-in-vacances="isDayInVacances"
            :get-reservations-for-day="getReservationsForDay"
            :get-salle-name="getSalleName"
            :get-salle-color-classes="getSalleColorClasses"
            :format-reservation-date-time="formatReservationDateTime"
            :get-reservation-status-label="getReservationStatusLabel"
            @reservation-click="handleReservationClick"
          />
        </div>
        <section class="print-only print-list mt-6">
          <template v-if="printListGroups.length > 0">
            <article
              v-for="dayGroup in printListGroups"
              :key="dayGroup.dayKey"
              class="print-day-group mb-6"
            >
              <h2 class="text-base font-semibold mb-2">
                {{ format(dayGroup.dayDate, 'EEEE d MMMM yyyy', { locale: fr }) }}
              </h2>

              <div
                v-for="salleGroup in dayGroup.salles"
                :key="`${dayGroup.dayKey}-${salleGroup.salleId}`"
                class="print-salle-group mb-3"
              >
                <h3 class="text-sm font-semibold mb-1">
                  {{ getSalleName(salleGroup.salleId) }}
                </h3>
                <ul class="pl-4 list-disc">
                  <li
                    v-for="reservation in salleGroup.reservations"
                    :key="reservation.id"
                    class="text-sm mb-1"
                  >
                    {{ format(parseISO(reservation.date_debut), 'HH:mm') }} - {{ format(parseISO(reservation.date_fin), 'HH:mm') }}
                    - {{ reservation.prenom }} {{ reservation.nom }}
                    <span v-if="reservation.nom_association">
                      ({{ reservation.nom_association }})
                    </span>
                    - {{ getReservationStatusLabel(reservation.status) }}
                  </li>
                </ul>
              </div>
            </article>
          </template>
          <p v-else class="text-sm">
            Aucune réservation sur la période sélectionnée.
          </p>
        </section>
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

<style scoped>
.print-only {
  display: none;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  :global(body) {
    background: #fff !important;
    color: #000 !important;
  }

  :global(.udashboard-navbar),
  :global(.udashboard-sidebar-collapse),
  :global(.u-button),
  :global(.u-tooltip-content),
  :global(.u-modal),
  :global(.notification-bell) {
    display: none !important;
  }

  /* Hide the dashboard panel top header row in print. */
  :global(#dashboard-panel-reservations-salles > div[data-slot='root']) {
    display: none !important;
  }

  .print-only {
    display: block;
  }

  .print-mode-view .print-list {
    display: none !important;
  }

  .print-mode-list .print-view-content {
    display: none !important;
  }

  .print-mode-list .print-header,
  .print-mode-list .print-list {
    display: block !important;
  }

  .print-header,
  .print-day-group,
  .print-salle-group {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .non-print-controls {
    display: none !important;
  }

  .non-print-salles {
    display: none !important;
  }
}
</style>
