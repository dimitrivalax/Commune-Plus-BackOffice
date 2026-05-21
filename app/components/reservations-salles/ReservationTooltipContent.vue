<script setup lang="ts">
import type { ReservationSalle } from '~/types'
import ReservationsSallesReservationStatusBadge from '~/components/reservations-salles/ReservationStatusBadge.vue'

defineProps<{
  reservation: ReservationSalle
  getSalleName: (salleId: string) => string
  formatReservationDateTime: (date: string) => string
}>()
</script>

<template>
  <div class="w-64 rounded-lg border border-default bg-default shadow-lg p-2 text-xs">
    <div class="font-semibold mb-1">
      {{ reservation.prenom }} {{ reservation.nom }}
    </div>
    <div v-if="reservation.nom_association" class="mb-1 text-muted">
      Motif : {{ reservation.nom_association }}
    </div>
    <div class="mb-1">
      Salle : {{ getSalleName(reservation.salle_id) }}
    </div>
    <div class="mb-1">
      Début : {{ formatReservationDateTime(reservation.date_debut) }}
    </div>
    <div class="mb-1">
      Fin : {{ formatReservationDateTime(reservation.date_fin) }}
    </div>
    <div class="mb-1 flex items-center gap-1.5">
      <span class="text-muted">Statut</span>
      <ReservationsSallesReservationStatusBadge :status="reservation.status" size="sm" />
    </div>
    <div class="text-muted truncate">
      {{ reservation.email }} - {{ reservation.telephone }}
    </div>
  </div>
</template>
