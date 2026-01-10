<script setup lang="ts">
import type { MunicipalInfo } from '~/types'

const props = defineProps<{
  info: MunicipalInfo | null
}>()

const open = ref(false)

const toast = useToast()
const refresh = inject<() => void>('refresh-informations')
const { getAuthHeaders } = useApiAuth()

const description = computed(() => {
  if (!props.info) return 'Êtes-vous sûr de vouloir supprimer cette information ? Cette action ne peut pas être annulée.'
  return `Êtes-vous sûr de vouloir supprimer "${props.info.title}" ? Cette action ne peut pas être annulée.`
})

async function onSubmit() {
  if (!props.info) return

  try {
    await $fetch(`/api/municipal-info/${props.info.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    toast.add({
      title: 'Succès',
      description: `L'information "${props.info.title}" a été supprimée`,
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
  <UModal v-model:open="open" title="Supprimer l'information" :description="description">
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton label="Annuler" color="neutral" variant="subtle" @click="open = false" />
        <UButton label="Supprimer" color="error" variant="solid" loading-auto @click="onSubmit" />
      </div>
    </template>
  </UModal>
</template>
