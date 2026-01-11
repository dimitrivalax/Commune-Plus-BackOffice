import type { Commune } from '~/types'

/**
 * Composable pour gérer la commune courante sélectionnée par l'utilisateur
 */
export const useCurrentCommune = () => {
  const currentCommune = useState<Commune | null>('current_commune', () => null)
  const { getAuthHeaders } = useApiAuth()

  // Charger les communes de l'utilisateur connecté
  const { data: userCommunes, refresh: refreshUserCommunes } = useFetch<Commune[]>('/api/user/communes', {
    lazy: true,
    default: () => [],
    headers: getAuthHeaders()
  })

  // Initialiser la commune courante avec la première commune si aucune n'est sélectionnée
  watchEffect(() => {
    if (!currentCommune.value && userCommunes.value && userCommunes.value.length > 0) {
      // Essayer de récupérer depuis le localStorage
      const savedCommuneId = localStorage.getItem('current_commune_id')
      if (savedCommuneId) {
        const savedCommune = userCommunes.value.find(c => c.id === savedCommuneId)
        if (savedCommune) {
          currentCommune.value = savedCommune
          return
        }
      }
      // Sinon, prendre la première commune
      currentCommune.value = userCommunes.value[0]
      localStorage.setItem('current_commune_id', userCommunes.value[0].id)
    }
  })

  // Sauvegarder dans localStorage quand la commune change
  watch(currentCommune, (newCommune) => {
    if (newCommune) {
      localStorage.setItem('current_commune_id', newCommune.id)
    } else {
      localStorage.removeItem('current_commune_id')
    }
  })

  const setCurrentCommune = (commune: Commune | null) => {
    currentCommune.value = commune
  }

  return {
    currentCommune: readonly(currentCommune),
    userCommunes: readonly(userCommunes),
    setCurrentCommune,
    refreshUserCommunes
  }
}
