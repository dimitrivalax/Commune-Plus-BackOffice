/**
 * Composable pour obtenir les headers d'authentification pour les appels API
 */
export const useApiAuth = () => {
  const { session } = useSupabase()

  const getAuthHeaders = (): Record<string, string> => {
    const currentSession = session.value
    if (!currentSession?.access_token) {
      return {}
    }

    return {
      Authorization: `Bearer ${currentSession.access_token}`
    }
  }

  return {
    getAuthHeaders
  }
}
