import { getErrorMessage } from '~/utils/errorMessage'
import type { Commune } from '~/types'

export const useUtilisateursService = () => {
  const { getAuthHeaders } = useApiAuth()

  async function listCommunes() {
    return await $fetch<Commune[]>('/api/communes', {
      headers: getAuthHeaders()
    })
  }

  async function createUtilisateur(payload: {
    nom: string
    prenom: string
    email: string
    role: 'utilisateur' | 'administrateur'
    communes: string[]
  }) {
    return await $fetch('/api/utilisateurs/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: payload
    })
  }

  async function updateUtilisateur(id: string, payload: {
    nom: string
    prenom: string
    numero_de_rue: string | null
    rue: string | null
    code_postal: string | null
    ville: string | null
    email: string
    role: 'utilisateur' | 'administrateur'
    is_active: boolean
    communes: string[]
  }) {
    return await $fetch(`/api/utilisateurs/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: payload
    })
  }

  async function deleteUtilisateur(id: string) {
    return await $fetch(`/api/utilisateurs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
  }

  async function setUtilisateurActive(utilisateurId: string, isActive: boolean) {
    try {
      await $fetch(`/api/utilisateurs/${utilisateurId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: { is_active: isActive }
      })
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Action impossible'))
    }
  }

  return {
    listCommunes,
    createUtilisateur,
    updateUtilisateur,
    deleteUtilisateur,
    setUtilisateurActive
  }
}
