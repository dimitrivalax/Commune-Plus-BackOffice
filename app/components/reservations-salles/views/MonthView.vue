<script setup lang="ts">
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ReservationSalle, Salle } from '~/types'

defineProps<{
  currentDate: Date
  status: string
  salles: Salle[] | null | undefined
  displayedSalles: Salle[]
  daysToShow: Date[]
  weeksInMonth: Date[][]
  isDayInVacances: (day: Date) => boolean
  getReservationsForDay: (day: Date) => ReservationSalle[]
  getSalleName: (salleId: string) => string
  getSalleColorClasses: (salleId: string) => string
  formatReservationDateTime: (date: string) => string
  getReservationStatusLabel: (status?: ReservationSalle['status']) => string
}>()

const emit = defineEmits<{
  reservationClick: [reservation: ReservationSalle]
}>()

const today = new Date()
</script>

<template>
  <div class="overflow-x-auto overflow-y-visible month-print-root">
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
      <div class="grid month-grid" :style="{ gridTemplateColumns: 'repeat(7, 1fr)' }">
        <div
          v-for="day in daysToShow.slice(0, 7)"
          :key="day.toString()"
          class="p-2 bg-elevated/30 font-medium text-center border-r border-b border-default last:border-r-0"
        >
          {{ format(day, 'EEE', { locale: fr }) }}
        </div>
      </div>

      <template v-for="(week, weekIndex) in weeksInMonth" :key="weekIndex">
        <div class="grid month-grid" :style="{ gridTemplateColumns: 'repeat(7, 1fr)' }">
          <div
            v-for="day in week"
            :key="day.toString()"
            class="p-1 month-day-cell border-r border-b border-default last:border-r-0"
            :class="{
              'bg-muted/20': !isSameMonth(day, currentDate),
              'bg-warning/10': isDayInVacances(day)
            }"
          >
            <div class="text-xs text-muted mb-1" :class="{ 'font-bold text-primary': isSameDay(day, today) }">
              {{ format(day, 'd') }}
            </div>
            <div v-if="isDayInVacances(day)" class="mb-1">
              <UBadge
                color="warning"
                variant="soft"
                label="Vacances"
                size="xs"
              />
            </div>
            <UTooltip
              v-for="reservation in getReservationsForDay(day)"
              :key="reservation.id"
              :delay-duration="100"
              :content="{ side: 'top', sideOffset: 8 }"
              :ui="{ content: 'h-auto p-0 bg-transparent shadow-none ring-0' }"
            >
              <template #content>
                <ReservationsSallesReservationTooltipContent
                  :reservation="reservation"
                  :get-salle-name="getSalleName"
                  :format-reservation-date-time="formatReservationDateTime"
                  :get-reservation-status-label="getReservationStatusLabel"
                />
              </template>
              <div
                class="relative mb-1 p-1 border rounded text-xs cursor-pointer"
                :class="getSalleColorClasses(reservation.salle_id)"
                @click="emit('reservationClick', reservation)"
              >
                <div class="font-semibold mb-1">
                  {{ reservation.prenom }} {{ reservation.nom }}
                </div>
                <div v-if="reservation.nom_association" class="text-xs text-muted truncate">
                  Asso : {{ reservation.nom_association }}
                </div>
                <div class="text-xs text-muted truncate">
                  {{ getSalleName(reservation.salle_id) }} -
                  {{ format(parseISO(reservation.date_debut), 'HH:mm') }} -
                  {{ format(parseISO(reservation.date_fin), 'HH:mm') }}
                </div>
              </div>
            </UTooltip>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.month-day-cell {
  min-height: 100px;
}

@media print {
  .month-grid {
    font-size: 10px;
  }

  .month-day-cell {
    min-height: 72px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
</style>
