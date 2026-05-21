<script setup lang="ts">
import type { ReservationSalle } from '~/types'
import { getReservationStatusColor, getReservationStatusLabel } from '~/utils/reservation-salle-status'

withDefaults(defineProps<{
  status?: ReservationSalle['status']
  size?: 'xs' | 'sm' | 'md'
}>(), {
  size: 'xs'
})
</script>

<template>
  <UBadge
    :label="getReservationStatusLabel(status)"
    :color="getReservationStatusColor(status)"
    variant="subtle"
    :size="size"
  />
</template>
