<script setup lang="ts">
import type { MunicipalInfo } from '~/types'
import { getErrorMessage } from '~/utils/errorMessage'

const props = defineProps<{
  info: MunicipalInfo | null
}>()

const open = ref(false)

const toast = useToast()
const refresh = inject<() => void>('refresh-notifications')
const { deleteMunicipalInfo } = useMunicipalInfoService()

const description = computed(() => {
  if (!props.info) return 'Êtes-vous sûr de vouloir supprimer cette notification ? Cette action ne peut pas être annulée.'
  return `Êtes-vous sûr de vouloir supprimer "${props.info.title}" ? Cette action ne peut pas être annulée.`
})

async function onSubmit() {
  if (!props.info) return

  try {
    await deleteMunicipalInfo(props.info.id)

    toast.add({
      title: 'Succès',
      description: `La notification "${props.info.title}" a été supprimée`,
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
  <UModal v-model:open="open" title="Supprimer la notification" :description="description">
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
