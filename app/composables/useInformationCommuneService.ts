import { getErrorMessage } from '~/utils/errorMessage'

interface ReorderInformationCommunePayload {
  id: string
  commune_id?: string | null
  direction: 'up' | 'down'
}

interface CreateInformationCommunePayload {
  title: string
  description: string
  photo_url: string | null
  published: boolean
  commune_id: string
}

interface UpdateInformationCommunePayload {
  title: string
  description: string
  photo_url: string | null
  published: boolean
}

export const useInformationCommuneService = () => {
  const { getAuthHeaders } = useApiAuth()

  async function createInformation(payload: CreateInformationCommunePayload) {
    return await $fetch('/api/information-commune/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: payload
    })
  }

  async function updateInformation(id: string, payload: UpdateInformationCommunePayload) {
    return await $fetch(`/api/information-commune/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: payload
    })
  }

  async function deleteInformation(id: string) {
    return await $fetch(`/api/information-commune/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
  }

  async function reorderInformation(payload: ReorderInformationCommunePayload) {
    try {
      await $fetch('/api/information-commune/reorder', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: payload
      })
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Impossible de réordonner'))
    }
  }

  return {
    createInformation,
    updateInformation,
    deleteInformation,
    reorderInformation
  }
}
