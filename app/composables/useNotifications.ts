import type { Notification as AppNotification } from '~/types'
import { createSharedComposable } from '@vueuse/core'
import { getErrorMessage } from '~/utils/errorMessage'

const MAX_ITEMS = 50
const POLL_MS = 25000
const STORAGE_KEY = 'commune-plus:backoffice:notifications'

type BackofficeNotificationRow = {
  id: string | number
  title?: string | null
  body?: string | null
  message?: string | null
  created_at?: string | null
  date?: string | null
  unread?: boolean | null
  is_read?: boolean | null
  type?: 'signalement' | 'reservation' | null
  entity_id?: string | null
}

const DEFAULT_SENDER = {
  id: 0,
  name: 'Commune Plus',
  email: 'notifications@commune.plus',
  status: 'subscribed',
  location: ''
} as const

function saveToStorage(notifications: unknown) {
  if (import.meta.server) return
  try {
    const serializable = Array.isArray(notifications) ? notifications.slice(0, MAX_ITEMS) : []
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  } catch {
    // Ignore localStorage failures (private mode/quota/etc.)
  }
}

function loadFromStorage(): AppNotification[] {
  if (import.meta.server) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, MAX_ITEMS) as AppNotification[]
  } catch {
    // Ignore malformed storage data and start from empty state.
    return []
  }
}

function rowToNotification(row: BackofficeNotificationRow): AppNotification {
  return {
    id: row.id,
    unread: row.unread ?? !(row.is_read ?? false),
    sender: DEFAULT_SENDER,
    body: row.body ?? row.message ?? '',
    date: row.created_at ?? row.date ?? new Date().toISOString(),
    type: row.type ?? undefined,
    entity_id: row.entity_id ?? undefined,
    title: row.title ?? undefined
  }
}

const _useNotifications = () => {
  const { session } = useSupabase()
  const { getAuthHeaders } = useApiAuth()
  const notifications = ref<AppNotification[]>(loadFromStorage())
  const notificationsError = ref<Error | null>(null)
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function refreshNotifications() {
    if (!session.value?.access_token) {
      notificationsError.value = null
      notifications.value = []
      saveToStorage(notifications.value)
      return
    }
    try {
      const rows = await $fetch<BackofficeNotificationRow[]>('/api/notifications', {
        headers: getAuthHeaders()
      })
      notificationsError.value = null
      notifications.value = (rows || []).map(rowToNotification).slice(0, MAX_ITEMS)
      saveToStorage(notifications.value)
    } catch (error: unknown) {
      notificationsError.value = new Error(getErrorMessage(error, 'Erreur notifications'))
      notifications.value = loadFromStorage()
    }
  }

  function startPolling() {
    if (pollTimer || !import.meta.client) return
    pollTimer = setInterval(() => {
      void refreshNotifications()
    }, POLL_MS)
  }

  function stopPolling() {
    if (!pollTimer) return
    clearInterval(pollTimer)
    pollTimer = null
  }

  async function removeNotification(id: string | number) {
    const idStr = String(id)
    const currentNotifications = notifications.value as unknown as AppNotification[]
    const previousNotifications: AppNotification[] = currentNotifications.slice()
    const nextNotifications: AppNotification[] = []
    for (const notification of previousNotifications) {
      if (String(notification.id) !== idStr) {
        nextNotifications.push(notification)
      }
    }
    notifications.value = nextNotifications
    saveToStorage(notifications.value)

    if (!session.value?.access_token) {
      return
    }

    try {
      await $fetch(`/api/notifications/${idStr}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      notificationsError.value = null
    } catch (error: unknown) {
      notifications.value = previousNotifications
      saveToStorage(notifications.value)
      notificationsError.value = new Error(getErrorMessage(error, 'Suppression de la notification impossible'))
    }
  }

  function addNotification(notification: AppNotification) {
    const currentNotifications = notifications.value as unknown as AppNotification[]
    notifications.value = [notification, ...currentNotifications].slice(0, MAX_ITEMS)
    saveToStorage(notifications.value)
  }

  async function clearAll() {
    const previousNotifications = (notifications.value as unknown as AppNotification[]).slice()
    notifications.value = []
    saveToStorage(notifications.value)

    if (!session.value?.access_token) {
      return
    }

    try {
      await $fetch('/api/notifications/clear', {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      notificationsError.value = null
    } catch (error: unknown) {
      notifications.value = previousNotifications
      saveToStorage(notifications.value)
      notificationsError.value = new Error(getErrorMessage(error, 'Suppression des notifications impossible'))
    }
  }

  const unreadCount = computed(() => {
    let n = 0
    for (const item of notifications.value) {
      if (item.unread) n++
    }
    return n
  })

  if (import.meta.client) {
    watch(
      () => session.value?.access_token,
      async (token) => {
        stopPolling()
        if (token) {
          await refreshNotifications()
          startPolling()
        } else {
          notificationsError.value = null
          notifications.value = []
          saveToStorage(notifications.value)
        }
      },
      { immediate: true }
    )
  }

  return {
    notifications: readonly(notifications),
    unreadCount,
    refreshNotifications,
    removeNotification,
    clearAll,
    addNotification,
    notificationsError
  }
}

export const useNotifications = createSharedComposable(_useNotifications)
