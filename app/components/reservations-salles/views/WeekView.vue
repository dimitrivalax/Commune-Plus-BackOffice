<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ReservationSalle, Salle } from '~/types'

defineProps<{
  status: string
  salles: Salle[] | null | undefined
  displayedSalles: Salle[]
  daysToShow: Date[]
  isDayInVacances: (day: Date) => boolean
  getReservationsForSalleAndDay: (salleId: string, day: Date) => ReservationSalle[]
  getSalleColorClasses: (salleId: string) => string
  getSalleName: (salleId: string) => string
  formatReservationDateTime: (date: string) => string
  getReservationStatusLabel: (status?: ReservationSalle['status']) => string
}>()

const emit = defineEmits<{
  reservationClick: [reservation: ReservationSalle]
}>()
</script>

<template>
  <div class="overflow-x-auto overflow-y-visible week-print-root">
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
      <div class="grid week-grid" :style="{ gridTemplateColumns: `200px repeat(${daysToShow.length}, 1fr)` }">
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
          <div v-if="isDayInVacances(day)" class="mt-1">
            <UBadge
              color="warning"
              variant="soft"
              label="Vacances"
              size="xs"
            />
          </div>
        </div>

        <template v-for="salle in displayedSalles" :key="salle.id">
          <div class="border-r border-b border-default p-2 font-medium">
            {{ salle.nom }}
          </div>
          <div
            v-for="day in daysToShow"
            :key="`${salle.id}-${day.toString()}`"
            class="border-b border-default p-2 week-day-cell relative"
          >
            <UTooltip
              v-for="reservation in getReservationsForSalleAndDay(salle.id, day)"
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
                class="relative mb-1 p-2 border rounded text-xs cursor-pointer"
                :class="getSalleColorClasses(reservation.salle_id)"
                @click="emit('reservationClick', reservation)"
              >
                <div class="font-semibold mb-1">
                  {{ reservation.prenom }} {{ reservation.nom }}
                </div>
                <div v-if="reservation.nom_association" class="text-xs text-muted truncate">
                  Asso : {{ reservation.nom_association }}
                </div>
                <div class="text-xs font-medium truncate">
                  Statut : {{ getReservationStatusLabel(reservation.status) }}
                </div>
                <div class="text-xs text-muted">
                  {{ format(parseISO(reservation.date_debut), 'HH:mm') }} -
                  {{ format(parseISO(reservation.date_fin), 'HH:mm') }}
                </div>
              </div>
            </UTooltip>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.week-day-cell {
  min-height: 100px;
}

@media print {
  .week-grid {
    font-size: 11px;
  }

  .week-day-cell {
    min-height: 72px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
</style>
