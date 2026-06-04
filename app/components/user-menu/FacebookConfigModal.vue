<script setup lang="ts">
import { getErrorMessage } from '~/utils/errorMessage'
import { useFacebookPublicationService } from '~/composables/useFacebookPublicationService'

const { currentCommune } = useCurrentCommune()
const { isAdministrator } = useCurrentUser()
const toast = useToast()
const { getConnectUrl, getFacebookStatus, disconnectFacebook } = useFacebookPublicationService()
const { isFacebookConfigModalOpen, closeFacebookConfigModal } = useFacebookConfigModal()
const {
  markFacebookOAuthPending,
  setupFacebookOAuthWindowRefresh
} = useFacebookOAuthFeedback()

const isFacebookLoading = ref(false)
const isDisconnecting = ref(false)
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
      markFacebookOAuthPending()
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    toast.add({
      title: 'Connexion Facebook',
      description: 'Terminez la connexion dans la fenêtre Facebook, puis revenez ici et cliquez sur « Rafraîchir le statut ».',
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

async function disconnectFacebookForCommune() {
  if (!currentCommune.value?.id) {
    toast.add({
      title: 'Erreur',
      description: 'Aucune commune sélectionnée.',
      color: 'error'
    })
    return
  }
  if (!facebookStatus.value?.connected) return

  isDisconnecting.value = true
  try {
    const result = await disconnectFacebook(currentCommune.value.id)
    if (result.disconnected) {
      toast.add({
        title: 'Facebook déconnecté',
        description: result.page_name
          ? `La page « ${result.page_name} » n’est plus reliée à cette commune.`
          : 'La page Facebook n’est plus reliée à cette commune.',
        color: 'success'
      })
    } else {
      toast.add({
        title: 'Information',
        description: 'Aucune page Facebook n’était connectée pour cette commune.',
        color: 'info'
      })
    }
    await refreshFacebookStatus()
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: getErrorMessage(error, 'Impossible de déconnecter Facebook.'),
      color: 'error'
    })
  } finally {
    isDisconnecting.value = false
  }
}

watch(() => isFacebookConfigModalOpen.value, (open) => {
  if (open) {
    void refreshFacebookStatus()
  }
})

setupFacebookOAuthWindowRefresh(() => {
  if (isFacebookConfigModalOpen.value) {
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
        <ul
          v-if="!facebookStatus?.connected && !isFacebookLoading"
          class="list-disc space-y-1 pl-5 text-xs text-neutral-500 dark:text-neutral-500"
        >
          <li v-if="isAdministrator">
            Vérifiez que la bonne commune est sélectionnée dans le menu latéral avant de connecter.
          </li>
          <li>
            Le compte Facebook doit être <strong>administrateur d'une page</strong> (pas seulement un profil personnel).
          </li>
          <li>
            Après la fenêtre Facebook, cliquez sur « Rafraîchir le statut » si le message ne se met pas à jour.
          </li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <UButton
            :label="facebookStatus?.connected ? 'Reconnecter Facebook' : 'Connecter Facebook'"
            color="neutral"
            icon="i-lucide-link"
            @click="connectFacebook"
          />
          <UButton
            v-if="facebookStatus?.connected"
            label="Déconnecter Facebook"
            color="error"
            variant="subtle"
            icon="i-lucide-unlink"
            :loading="isDisconnecting"
            :disabled="isFacebookLoading"
            @click="disconnectFacebookForCommune"
          />
          <UButton
            label="Rafraîchir le statut"
            color="neutral"
            variant="subtle"
            icon="i-lucide-refresh-cw"
            :disabled="isFacebookLoading || isDisconnecting"
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
