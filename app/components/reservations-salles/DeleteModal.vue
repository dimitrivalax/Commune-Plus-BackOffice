<script setup lang="ts">
import type { ReservationSalle } from '~/types'

const props = defineProps<{
  reservation: ReservationSalle | null
}>()

const open = ref(false)

const toast = useToast()
const refresh = inject<() => void>('refresh-reservations-salles')
const { getAuthHeaders } = useApiAuth()

const description = computed(() => {
  if (!props.reservation) return 'Êtes-vous sûr de vouloir supprimer cette réservation ? Cette action ne peut pas être annulée.'
  return `Êtes-vous sûr de vouloir supprimer la réservation de ${props.reservation.prenom} ${props.reservation.nom} ? Cette action ne peut pas être annulée.`
})

async function onSubmit() {
  if (!props.reservation) return

  try {
    await $fetch(`/api/reservations-salles/${props.reservation.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    toast.add({
      title: 'Succès',
      description: 'La réservation a été supprimée',
      color: 'success'
    })

    open.value = false

    if (refresh) {
      refresh()
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue lors de la suppression',
      color: 'error'
    })
  }
}

function openModal() {
  open.value = true
}

defineExpose({
  openModal
})
</script>

<template>
  <UModal v-model:open="open" title="Supprimer la réservation" :description="description">
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton label="Annuler" color="neutral" variant="subtle" @click="open = false" />
        <UButton label="Supprimer" color="error" variant="solid" loading-auto @click="onSubmit" />
      </div>
    </template>
  </UModal>
</template>
