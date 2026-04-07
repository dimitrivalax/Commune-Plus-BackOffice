/**
 * Composable pour obtenir les headers d'authentification pour les appels API
 */
export const useApiAuth = () => {
  const { session } = useSupabase()

  const getAuthHeaders = (): Record<string, string> => {
    const token = session.value?.access_token
    if (!token) {
      return {} as Record<string, string>
    }
    return { Authorization: `Bearer ${token}` }
  }

  return {
    getAuthHeaders
  }
}
