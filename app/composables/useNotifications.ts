import type { Notification, User } from '~/types'
import { createSharedComposable } from '@vueuse/core'

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

const DEFAULT_SENDER: User = {
  id: 0,
  name: 'Commune Plus',
  email: 'notifications@commune.plus',
  status: 'subscribed',
  location: '',
}

function saveToStorage(notifications: unknown) {
  if (import.meta.server) return
  try {
    const serializable = Array.isArray(notifications) ? notifications.slice(0, MAX_ITEMS) : []
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  } catch {
    // Ignore localStorage failures (private mode/quota/etc.)
  }
}

function rowToNotification(row: BackofficeNotificationRow): Notification {
  return {
    id: row.id,
    unread: row.unread ?? !(row.is_read ?? false),
    sender: DEFAULT_SENDER,
    body: row.body ?? row.message ?? '',
    date: row.created_at ?? row.date ?? new Date().toISOString(),
    type: row.type ?? undefined,
    entity_id: row.entity_id ?? undefined,
    title: row.title ?? undefined,
  }
}

const _useNotifications = () => {
  const { session } = useSupabase()
  const { getAuthHeaders } = useApiAuth()
  const notifications = shallowRef<Notification[]>(loadFromStorage())
  const notificationsError = ref<Error | null>(null)
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function fetchNotifications() {
    if (!session.value?.access_token) {
      notifications.value = []
      return
    }
    notificationsError.value = null
    try {
      const rows = await $fetch<BackofficeNotificationRow[]>('/api/notifications', {
        headers: getAuthHeaders(),
      })
      notifications.value = (rows || []).map(rowToNotification).slice(0, MAX_ITEMS)
      saveToStorage(notifications.value)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur notifications'
      notificationsError.value = new Error(msg)
    }
  }

  function startPolling() {
    if (pollTimer || !import.meta.client) return
    pollTimer = setInterval(() => {
      void fetchNotifications()
    }, POLL_MS)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  async function refreshNotifications() {
    await fetchNotifications()
  }

  async function markAsRead(id: string | number) {
    const idStr = String(id)
    if (session.value?.access_token) {
      try {
        await $fetch(`/api/notifications/${idStr}/read`, {
          method: 'POST',
          headers: getAuthHeaders(),
        })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        notificationsError.value = new Error(msg)
      }
    }
    const list = notifications.value
    const index = list.findIndex((n) => String(n.id) === idStr)
    if (index === -1) return
    const current = list[index]
    if (!current?.unread) return
    const next = notifications.value.slice()
    next[index] = { ...current, unread: false }
    notifications.value = next
    saveToStorage(notifications.value)
  }

  function addNotification(notification: Notification) {
    notifications.value = [notification, ...notifications.value].slice(0, MAX_ITEMS)
    saveToStorage(notifications.value)
  }

  function clearAll() {
    notifications.value = []
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
          await fetchNotifications()
          startPolling()
        } else {
          notifications.value = []
        }
      },
      { immediate: true },
    )
  }

  return {
    notifications: readonly(notifications),
    unreadCount,
    refreshNotifications,
    markAsRead,
    clearAll,
    notificationsError,
  }
}

export const useNotifications = createSharedComposable(_useNotifications)
