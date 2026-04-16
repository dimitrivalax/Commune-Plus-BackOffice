<script setup lang="ts">
import type { MunicipalInfo } from '~/types'

const props = defineProps<{
  info: MunicipalInfo | null
}>()

const open = ref(false)

const toast = useToast()
const refresh = inject<() => void>('refresh-actualites')
const { deleteMunicipalInfo } = useMunicipalInfoService()

const description = computed(() => {
  if (!props.info) return 'Êtes-vous sûr de vouloir supprimer cette information ? Cette action ne peut pas être annulée.'
  return `Êtes-vous sûr de vouloir supprimer "${props.info.title}" ? Cette action ne peut pas être annulée.`
})

async function onSubmit() {
  if (!props.info) return

  try {
    await deleteMunicipalInfo(props.info.id)

    toast.add({
      title: 'Succès',
      description: `L'information "${props.info.title}" a été supprimée`,
      color: 'success'
    })

    open.value = false

    if (refresh) {
      refresh()
    }
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : 'Une erreur est survenue lors de la suppression'
    toast.add({
      title: 'Erreur',
      description: message,
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
  <UModal v-model:open="open" title="Supprimer l'actualité" :description="description">
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
