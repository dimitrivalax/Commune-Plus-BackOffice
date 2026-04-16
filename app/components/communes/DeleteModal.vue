<script setup lang="ts">
import type { Commune } from '~/types'
import { getErrorMessage } from '~/utils/errorMessage'

const props = defineProps<{
  commune: Commune | null
}>()

const open = ref(false)

const toast = useToast()
const refresh = inject<() => void>('refresh-communes')
const { deleteCommune } = useCommunesService()

const description = computed(() => {
  if (!props.commune) return 'Êtes-vous sûr de vouloir supprimer cette commune ? Cette action ne peut pas être annulée.'
  return `Êtes-vous sûr de vouloir supprimer "${props.commune.name}" ? Cette action ne peut pas être annulée.`
})

async function onSubmit() {
  if (!props.commune) return

  try {
    await deleteCommune(props.commune.id)

    toast.add({
      title: 'Succès',
      description: `La commune "${props.commune.name}" a été supprimée`,
      color: 'success'
    })

    open.value = false

    if (refresh) {
      refresh()
    }
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: getErrorMessage(error, 'Une erreur est survenue lors de la suppression'),
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
  <UModal v-model:open="open" title="Supprimer la commune" :description="description">
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
