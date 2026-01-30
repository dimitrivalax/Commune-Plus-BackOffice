import type { Notification } from '~/types'

const STORAGE_KEY = 'backoffice-notifications'
const MAX_ITEMS = 50

function loadFromStorage(): Notification[] {
  if (import.meta.server) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Notification[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(items: Notification[]) {
  if (import.meta.server) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {
    // ignore
  }
}

/**
 * Composable pour gérer les notifications du BackOffice en localStorage (pas de base de données).
 */
export const useNotifications = () => {
  const notifications = ref<Notification[]>([])

  function init() {
    if (import.meta.client) {
      notifications.value = loadFromStorage()
    }
  }

  function refreshNotifications() {
    init()
  }

  function markAsRead(id: string | number) {
    const list = notifications.value
    const index = list.findIndex((n) => String(n.id) === String(id))
    if (index !== -1 && list[index].unread) {
      list[index] = { ...list[index], unread: false }
      notifications.value = [...list]
      saveToStorage(notifications.value)
    }
  }

  function addNotification(notification: Omit<Notification, 'id' | 'date'> & { id?: string | number; date?: string }) {
    if (import.meta.server) return
    const item: Notification = {
      ...notification,
      id: notification.id ?? crypto.randomUUID(),
      date: notification.date ?? new Date().toISOString(),
      unread: notification.unread ?? true
    }
    const list = [item, ...notifications.value].slice(0, MAX_ITEMS)
    notifications.value = list
    saveToStorage(list)
  }

  function clearAll() {
    notifications.value = []
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const unreadCount = computed(() =>
    notifications.value.filter((n) => n.unread).length
  )

  const notificationsError = ref<Error | null>(null)

  if (import.meta.client) {
    init()
  }

  return {
    notifications: readonly(notifications),
    unreadCount,
    refreshNotifications,
    markAsRead,
    addNotification,
    clearAll,
    notificationsError
  }
}
