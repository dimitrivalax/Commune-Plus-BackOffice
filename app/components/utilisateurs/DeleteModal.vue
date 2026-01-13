<script setup lang="ts">
import type { Utilisateur } from '~/types'

const props = defineProps<{
  utilisateur: Utilisateur | null
}>()

const open = ref(false)

const toast = useToast()
const refresh = inject<() => void>('refresh-utilisateurs')
const { getAuthHeaders } = useApiAuth()

const description = computed(() => {
  if (!props.utilisateur) return 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action supprimera également le compte Supabase associé et ne peut pas être annulée.'
  return `Êtes-vous sûr de vouloir supprimer "${props.utilisateur.prenom} ${props.utilisateur.nom}" ? Cette action supprimera également le compte Supabase associé et ne peut pas être annulée.`
})

async function onSubmit() {
  if (!props.utilisateur) return

  try {
    await $fetch(`/api/utilisateurs/${props.utilisateur.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    toast.add({
      title: 'Succès',
      description: `L'utilisateur "${props.utilisateur.prenom} ${props.utilisateur.nom}" a été supprimé`,
      color: 'success'
    })

    open.value = false

    if (refresh) {
      refresh()
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || error.message || 'Une erreur est survenue lors de la suppression',
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
  <UModal v-model:open="open" title="Supprimer l'utilisateur" :description="description">
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
