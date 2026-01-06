<script setup lang="ts">
withDefaults(defineProps<{
  count?: number
}>(), {
  count: 0
})

const open = ref(false)

async function onSubmit() {
  await new Promise(resolve => setTimeout(resolve, 1000))
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Supprimer ${count} client${count > 1 ? 's' : ''}`"
    :description="`Êtes-vous sûr, cette action ne peut pas être annulée.`"
  >
    <slot />

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
