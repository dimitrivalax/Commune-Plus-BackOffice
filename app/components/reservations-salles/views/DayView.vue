<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import type { ReservationSalle, Salle } from '~/types'
import type { DayPlacedReservation } from '~/composables/useReservationsSallesCalendar'

const props = defineProps<{
  currentDate: Date
  status: string
  salles: Salle[] | null | undefined
  displayedSalles: Salle[]
  hours: number[]
  dayStartHour: number
  dayEndHour: number
  isDayInVacances: (day: Date) => boolean
  getVacancesDescriptionForDay: (day: Date) => string | null
  getDayAgendaReservationsForSalle: (salleId: string, day: Date) => DayPlacedReservation[]
  getDayAgendaReservationStyle: (item: DayPlacedReservation) => Record<string, string>
  getSalleColorClasses: (salleId: string) => string
  getSalleName: (salleId: string) => string
  formatReservationDateTime: (date: string) => string
  getReservationStatusLabel: (status?: ReservationSalle['status']) => string
}>()

const emit = defineEmits<{
  reservationClick: [reservation: ReservationSalle]
  dayColumnClick: [event: MouseEvent, salleId: string, day: Date]
}>()

const currentDayVacancesDescription = computed(() => props.getVacancesDescriptionForDay(props.currentDate))
</script>

<template>
  <div class="overflow-x-auto overflow-y-visible day-print-root">
    <div
      v-if="isDayInVacances(currentDate)"
      class="mb-3 p-2 border border-warning/40 rounded bg-warning/10 text-sm"
    >
      <span class="font-medium">Vacances scolaires</span>
      <span v-if="currentDayVacancesDescription" class="text-muted">
        - {{ currentDayVacancesDescription }}
      </span>
    </div>
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
    <div v-else-if="displayedSalles.length === 0" class="text-center py-8">
      <p class="text-muted">
        Sélectionnez au moins une salle
      </p>
    </div>
    <div v-else class="border border-default rounded-lg overflow-visible">
      <div class="grid day-grid" :style="{ gridTemplateColumns: `120px repeat(${displayedSalles.length}, minmax(220px, 1fr))` }">
        <div class="border-r border-b border-default p-2 bg-elevated/50 font-medium">
          Heures
        </div>
        <div
          v-for="salle in displayedSalles"
          :key="salle.id"
          class="border-b border-default p-2 bg-elevated/50 font-medium text-center"
        >
          {{ salle.nom }}
        </div>

        <div class="border-r border-default relative day-hours-column">
          <div
            v-for="hour in hours"
            :key="`label-${hour}`"
            class="absolute -translate-y-1/2 left-2 text-xs text-muted"
            :style="{ top: `${((hour - dayStartHour) / (dayEndHour - dayStartHour)) * 100}%` }"
          >
            {{ hour }}h
          </div>
        </div>
        <div
          v-for="salle in displayedSalles"
          :key="`timeline-${salle.id}`"
          class="border-default border-l relative day-timeline-column cursor-pointer"
          @click="emit('dayColumnClick', $event, salle.id, currentDate)"
        >
          <div
            v-for="hour in hours"
            :key="`line-${salle.id}-${hour}`"
            class="absolute left-0 right-0 border-t border-default/60 pointer-events-none"
            :style="{ top: `${((hour - dayStartHour) / (dayEndHour - dayStartHour)) * 100}%` }"
          />
          <div class="absolute inset-0">
            <UTooltip
              v-for="item in getDayAgendaReservationsForSalle(salle.id, currentDate)"
              :key="item.reservation.id"
              :delay-duration="100"
              :content="{ side: 'top', sideOffset: 8 }"
              :ui="{ content: 'h-auto p-0 bg-transparent shadow-none ring-0' }"
            >
              <template #content>
                <ReservationsSallesReservationTooltipContent
                  :reservation="item.reservation"
                  :get-salle-name="getSalleName"
                  :format-reservation-date-time="formatReservationDateTime"
                  :get-reservation-status-label="getReservationStatusLabel"
                />
              </template>

              <div
                class="absolute border rounded p-1 text-xs z-10 overflow-hidden"
                :style="getDayAgendaReservationStyle(item)"
                :class="getSalleColorClasses(item.reservation.salle_id)"
                @click.stop="emit('reservationClick', item.reservation)"
              >
                <div class="font-semibold mb-1 truncate">
                  {{ item.reservation.prenom }} {{ item.reservation.nom }}
                </div>
                <div v-if="item.reservation.nom_association" class="text-xs text-muted truncate">
                  Asso : {{ item.reservation.nom_association }}
                </div>
                <div class="text-xs text-muted truncate">
                  {{ format(parseISO(item.reservation.date_debut), 'HH:mm') }} -
                  {{ format(parseISO(item.reservation.date_fin), 'HH:mm') }}
                </div>
              </div>
            </UTooltip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.day-hours-column,
.day-timeline-column {
  height: 900px;
}

@media print {
  .day-hours-column,
  .day-timeline-column {
    height: 660px;
  }

  .day-grid {
    font-size: 11px;
  }
}
</style>
