import type { Notification } from '~/types'

/**
 * Composable pour gérer les notifications du BackOffice
 */
export const useNotifications = () => {
  // S'assurer que nous sommes côté client
  if (import.meta.server) {
    return {
      notifications: ref<Notification[]>([]),
      unreadCount: computed(() => 0),
      refreshNotifications: () => {},
      notificationsError: ref(null)
    }
  }
  const { session } = useSupabase()

  // Headers d'authentification pour les appels API
  const authHeaders = computed((): Record<string, string> => {
    const currentSession = session.value
    if (!currentSession?.access_token) {
      return {}
    }
    return {
      Authorization: `Bearer ${currentSession.access_token}`
    }
  })

  // Récupérer les notifications
  const { data: notifications, refresh: refreshNotifications, error: notificationsError } = useFetch<Notification[]>('/api/notifications', {
    server: false, // Désactiver le SSR (la session n'est disponible que côté client)
    lazy: true, // Charger de manière paresseuse
    headers: authHeaders,
    default: () => []
  })

  // Compteur de notifications non lues
  const unreadCount = computed(() => {
    if (!notifications.value || !Array.isArray(notifications.value)) {
      return 0
    }
    return notifications.value.filter((n: Notification) => n.unread).length
  })

  // Charger les notifications quand la session est disponible
  watch(() => session.value?.access_token, (token) => {
    if (token) {
      // Attendre un peu pour que la session soit complètement initialisée
      nextTick(() => {
        refreshNotifications()
      })
    }
  }, { immediate: true })

  // Charger les notifications au montage du composant si la session est déjà disponible
  if (import.meta.client) {
    onMounted(() => {
      if (session.value?.access_token) {
        nextTick(() => {
          refreshNotifications()
        })
      }
    })
  }

  return {
    notifications: readonly(notifications),
    unreadCount,
    refreshNotifications,
    notificationsError
  }
}
