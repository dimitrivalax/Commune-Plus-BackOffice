import type { Commune } from '~/types'

/**
 * Composable pour gérer la commune courante sélectionnée par l'utilisateur
 */
export const useCurrentCommune = () => {
  const currentCommune = useState<Commune | null>('current_commune', () => null)
  const { getAuthHeaders } = useApiAuth()

  // Re-fetch quand la session est prête (changement de key = nouveau fetch avec les bons headers)
  const sessionToken = computed(() => useSupabase().session.value?.access_token ?? '')
  const fetchKey = computed(() => `user-communes-${sessionToken.value || 'anon'}`)
  const authHeaders = computed<HeadersInit>(() => getAuthHeaders())

  // Uniquement côté client : en SSR la session n'existe pas (auth middleware client-only),
  // un fetch serveur partirait sans Bearer et échouerait — liste vide jusqu'à une navigation.
  const { data: userCommunesData, pending: userCommunesPending, refresh: refreshUserCommunes } = useFetch<Commune[]>('/api/user/communes', {
    key: fetchKey,
    server: false,
    lazy: false,
    default: () => [],
    headers: authHeaders
  })
  const userCommunes = computed<Commune[]>(() => (userCommunesData.value as Commune[] | null) ?? [])

  // Session parfois hydratée après le premier tick ; relancer le fetch quand le jeton est disponible.
  if (import.meta.client) {
    watch(sessionToken, (token) => {
      if (token) {
        void refreshUserCommunes()
      }
    })
  }

  // Initialiser la commune courante avec la première commune si aucune n'est sélectionnée
  watchEffect(() => {
    if (!import.meta.client) {
      return
    }
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
      const firstCommune = userCommunes.value[0]
      if (!firstCommune) return
      currentCommune.value = firstCommune
      localStorage.setItem('current_commune_id', firstCommune.id)
    }
  })

  // Sauvegarder dans localStorage quand la commune change
  watch(currentCommune, (newCommune) => {
    if (!import.meta.client) {
      return
    }
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
    userCommunesPending: readonly(userCommunesPending),
    setCurrentCommune,
    refreshUserCommunes
  }
}
