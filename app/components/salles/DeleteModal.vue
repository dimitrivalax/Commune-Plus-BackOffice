<script setup lang="ts">
import type { Salle } from '~/types'

const props = defineProps<{
  salle: Salle | null
}>()

const open = ref(false)

const toast = useToast()
const refresh = inject<() => void>('refresh-salles')
const { getAuthHeaders } = useApiAuth()

const description = computed(() => {
  if (!props.salle) return 'Êtes-vous sûr de vouloir supprimer cette salle ? Cette action ne peut pas être annulée.'
  return `Êtes-vous sûr de vouloir supprimer "${props.salle.nom}" ? Cette action ne peut pas être annulée.`
})

async function onSubmit() {
  if (!props.salle) return

  try {
    await $fetch(`/api/salles/${props.salle.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    toast.add({
      title: 'Succès',
      description: `La salle "${props.salle.nom}" a été supprimée`,
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
  <UModal v-model:open="open" title="Supprimer la salle" :description="description">
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Annuler"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          label="Supprimer"
          color="error"
          variant="solid"
          loading-auto
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
