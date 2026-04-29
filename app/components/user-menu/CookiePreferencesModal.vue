<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

const { status, accept, refuse, reset } = useCookieConsent()
const toast = useToast()

const cookieStatusLabel = computed(() => {
  if (status.value === 'accepted') return 'Acceptés'
  if (status.value === 'refused') return 'Refusés'
  return 'En attente de choix'
})

function applyCookieChoice(choice: 'accepted' | 'refused' | 'reset') {
  if (choice === 'accepted') {
    accept()
    toast.add({
      title: 'Préférences cookies mises à jour',
      description: 'Les cookies optionnels sont désormais activés.',
      color: 'success'
    })
    return
  }

  if (choice === 'refused') {
    refuse()
    toast.add({
      title: 'Préférences cookies mises à jour',
      description: 'Les cookies optionnels sont désormais désactivés.',
      color: 'success'
    })
    return
  }

  reset()
  toast.add({
    title: 'Préférences cookies réinitialisées',
    description: 'Le bandeau de consentement sera affiché à nouveau.',
    color: 'success'
  })
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Préférences cookies"
    description="Gérez votre consentement pour les cookies optionnels (mesure d'audience)."
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <div class="space-y-4 py-2">
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Statut actuel :
          <span class="font-medium text-highlighted">
            {{ cookieStatusLabel }}
          </span>
        </p>
        <div class="flex flex-wrap gap-2">
          <UButton
            label="Accepter"
            color="success"
            variant="soft"
            @click="applyCookieChoice('accepted')"
          />
          <UButton
            label="Refuser"
            color="error"
            variant="soft"
            @click="applyCookieChoice('refused')"
          />
          <UButton
            label="Réinitialiser"
            color="neutral"
            variant="ghost"
            @click="applyCookieChoice('reset')"
          />
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
