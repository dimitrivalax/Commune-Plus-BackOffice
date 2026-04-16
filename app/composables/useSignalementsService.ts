import type { Signalement } from '~/types'

type UpdateSignalementPayload = {
  status?: Signalement['status']
  reponse?: string | null
}

export const useSignalementsService = () => {
  const { getAuthHeaders } = useApiAuth()

  async function listSignalements(communeId?: string | null) {
    return await $fetch<Signalement[]>('/api/signalements', {
      query: { commune_id: communeId },
      headers: getAuthHeaders()
    })
  }

  async function updateSignalement(signalementId: string, payload: UpdateSignalementPayload) {
    return await $fetch<Signalement>(`/api/signalements/${signalementId}`, {
      method: 'PUT',
      body: payload,
      headers: getAuthHeaders()
    })
  }

  return {
    listSignalements,
    updateSignalement
  }
}
