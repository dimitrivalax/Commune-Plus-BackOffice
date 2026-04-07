<script setup lang="ts">
interface CommuneInformation {
  id: string
  title: string
}

const props = defineProps<{
  info: CommuneInformation | null
}>()

const open = ref(false)
const isSubmitting = ref(false)
const toast = useToast()
const refresh = inject<() => void>('refresh-information-commune')
const { getAuthHeaders } = useApiAuth()

const description = computed(() => {
  if (!props.info) {
    return 'Êtes-vous sûr de vouloir supprimer cette information ? Cette action ne peut pas être annulée.'
  }
  return `Êtes-vous sûr de vouloir supprimer "${props.info.title}" ? Cette action ne peut pas être annulée.`
})

async function onSubmit() {
  if (!props.info) return
  try {
    isSubmitting.value = true
    await $fetch(`/api/information-commune/${props.info.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    toast.add({
      title: 'Succès',
      description: 'Information supprimée',
      color: 'success'
    })
    open.value = false
    refresh?.()
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: (error as Error)?.message || 'Impossible de supprimer',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
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
  <UModal
    v-model:open="open"
    title="Supprimer l'information"
    :description="description"
  >
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
          :loading="isSubmitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
