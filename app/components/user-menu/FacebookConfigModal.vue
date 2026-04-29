<script setup lang="ts">
import { getErrorMessage } from '~/utils/errorMessage'
import { useFacebookPublicationService } from '~/composables/useFacebookPublicationService'

const { currentCommune } = useCurrentCommune()
const toast = useToast()
const { getConnectUrl, getFacebookStatus } = useFacebookPublicationService()
const { isFacebookConfigModalOpen, closeFacebookConfigModal } = useFacebookConfigModal()

const isFacebookLoading = ref(false)
const facebookStatus = ref<{
  connected: boolean
  page_name?: string
  token_status?: 'active' | 'revoked' | 'expired'
} | null>(null)

async function refreshFacebookStatus() {
  if (!currentCommune.value?.id) {
    facebookStatus.value = null
    return
  }
  isFacebookLoading.value = true
  try {
    facebookStatus.value = await getFacebookStatus(currentCommune.value.id)
  } catch {
    facebookStatus.value = null
  } finally {
    isFacebookLoading.value = false
  }
}

async function connectFacebook() {
  if (!currentCommune.value?.id) {
    toast.add({
      title: 'Erreur',
      description: 'Aucune commune sélectionnée.',
      color: 'error'
    })
    return
  }
  try {
    const url = await getConnectUrl(currentCommune.value.id)
    if (import.meta.client) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    toast.add({
      title: 'Connexion Facebook',
      description: 'La fenêtre de connexion Facebook a été ouverte.',
      color: 'info'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: getErrorMessage(error, 'Impossible de démarrer la connexion Facebook.'),
      color: 'error'
    })
  }
}

watch(() => isFacebookConfigModalOpen.value, (open) => {
  if (open) {
    void refreshFacebookStatus()
  }
})
</script>

<template>
  <UModal
    v-model:open="isFacebookConfigModalOpen"
    title="Configuration Facebook"
    description="Connectez la page Facebook de la commune courante pour publier les actualités."
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4 py-2">
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Commune courante :
          <span class="font-medium text-highlighted">
            {{ currentCommune?.name || 'Aucune' }}
          </span>
        </p>
        <p v-if="isFacebookLoading" class="text-sm">
          Chargement du statut...
        </p>
        <p
          v-else-if="facebookStatus?.connected && facebookStatus.page_name"
          class="text-sm"
        >
          Connecté à la page : <strong>{{ facebookStatus.page_name }}</strong>
          <span
            v-if="facebookStatus.token_status && facebookStatus.token_status !== 'active'"
            class="text-warning"
          >
            ({{ facebookStatus.token_status }})
          </span>
        </p>
        <p v-else class="text-sm text-neutral-600 dark:text-neutral-400">
          Aucune page Facebook connectée pour la commune courante.
        </p>
        <div class="flex flex-wrap gap-2">
          <UButton
            :label="facebookStatus?.connected ? 'Reconnecter Facebook' : 'Connecter Facebook'"
            color="neutral"
            icon="i-lucide-link"
            @click="connectFacebook"
          />
          <UButton
            label="Rafraîchir le statut"
            color="neutral"
            variant="subtle"
            icon="i-lucide-refresh-cw"
            @click="refreshFacebookStatus"
          />
        </div>
      </div>
    </template>
    <template #footer>
      <UButton
        label="Fermer"
        color="neutral"
        variant="subtle"
        @click="closeFacebookConfigModal"
      />
    </template>
  </UModal>
</template>
