import type { MunicipalInfo } from '~/types'

export interface UsePublishMunicipalInfoOptions {
  /** Appelé après un envoi réussi (ex: rafraîchir la liste) */
  onSuccess?: () => void
}

/**
 * Composable réutilisable pour publier une information municipale et envoyer les notifications.
 * Utilisable depuis la page des actualités (menu ligne) ou depuis le modal d'édition.
 */
export const usePublishMunicipalInfo = (options: UsePublishMunicipalInfoOptions = {}) => {
  const toast = useToast()
  const { getAuthHeaders } = useApiAuth()
  const { currentCommune } = useCurrentCommune()
  const isPublishing = ref(false)

  async function publish(info: MunicipalInfo) {
    const communeId = info.commune_id || currentCommune.value?.id
    if (!communeId) {
      toast.add({
        title: 'Erreur',
        description:
          'Aucune commune associée à cette information. Veuillez sélectionner une commune dans le menu ou associer cette information à une commune.',
        color: 'error'
      })
      return
    }

    isPublishing.value = true
    try {
      await $fetch(`/api/municipal-info/${info.id}/publish`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { commune_id: communeId }
      })
      toast.add({
        title: 'Succès',
        description: 'La notification a été envoyée aux utilisateurs',
        color: 'success'
      })
      options.onSuccess?.()
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : 'Une erreur est survenue lors de l\'envoi de la notification'
      toast.add({
        title: 'Erreur',
        description: message,
        color: 'error'
      })
    } finally {
      isPublishing.value = false
    }
  }

  return {
    publish,
    isPublishing
  }
}
