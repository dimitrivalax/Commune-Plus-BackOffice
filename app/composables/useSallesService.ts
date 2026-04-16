import type { Salle } from '~/types'

interface CreateSallePayload {
  nom: string
  adresse: string
  nombre_max_places: number
  description: string | null
  photo_url: string | null
  commune_id?: string
}

interface UpdateSallePayload {
  nom: string
  adresse: string
  nombre_max_places: number
  description: string | null
  photo_url: string | null
}

export const useSallesService = () => {
  const { getAuthHeaders } = useApiAuth()

  async function createSalle(payload: CreateSallePayload) {
    return await $fetch<Salle>('/api/salles/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: payload
    })
  }

  async function updateSalle(id: string, payload: UpdateSallePayload) {
    return await $fetch<Salle>(`/api/salles/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: payload
    })
  }

  async function deleteSalle(id: string) {
    return await $fetch(`/api/salles/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
  }

  return { createSalle, updateSalle, deleteSalle }
}
