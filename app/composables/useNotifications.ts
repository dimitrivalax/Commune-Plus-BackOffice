import type { Notification, User } from '~/types'
import { createSharedComposable } from '@vueuse/core'

const STORAGE_KEY = 'backoffice-notifications'
const MAX_ITEMS = 50
const POLL_MS = 25000

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

const _useNotifications = () => {
  const { session } = useSupabase()
  const { getAuthHeaders } = useApiAuth()
  const notifications = ref<Notification[]>([])
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
    const next: Notification[] = [...list]
    next[index] = { ...current, unread: false }
    notifications.value = next
  }

  function clearAll() {
    notifications.value = []
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)
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
    addNotification,
    clearAll,
    notificationsError
  }
}
