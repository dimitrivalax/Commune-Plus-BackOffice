<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Nous contacter"
    description="Une question ou un besoin d'assistance ?"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <div class="space-y-4 py-2">
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Pour nous contacter, envoyez-nous un mail à l'adresse suivante :
        </p>
        <div
          class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center gap-2 group"
        >
          <UIcon name="i-lucide-mail" class="text-primary size-5" />
          <a
            href="mailto:contact@commune-plus.fr"
            class="text-primary font-semibold hover:underline decoration-2 underline-offset-4 transition-all"
          >
            contact@commune-plus.fr
          </a>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton
        label="Fermer"
        color="neutral"
        variant="subtle"
        @click="open = false"
      />
    </template>
  </UModal>
</template>
