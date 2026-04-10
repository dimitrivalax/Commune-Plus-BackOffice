<script setup lang="ts">
import type { ReservationSalle } from '~/types'

defineProps<{
  reservation: ReservationSalle
  getSalleName: (salleId: string) => string
  formatReservationDateTime: (date: string) => string
  getReservationStatusLabel: (status?: ReservationSalle['status']) => string
}>()
</script>

<template>
  <div class="w-64 rounded-lg border border-default bg-default shadow-lg p-2 text-xs">
    <div class="font-semibold mb-1">
      {{ reservation.prenom }} {{ reservation.nom }}
    </div>
    <div v-if="reservation.nom_association" class="mb-1 text-muted">
      Assoc. : {{ reservation.nom_association }}
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
    <div class="mb-1">
      Statut : {{ getReservationStatusLabel(reservation.status) }}
    </div>
    <div class="text-muted truncate">
      {{ reservation.email }} - {{ reservation.telephone }}
    </div>
  </div>
</template>
