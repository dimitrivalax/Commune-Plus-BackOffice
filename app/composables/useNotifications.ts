import type { Notification, User } from '~/types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createSharedComposable } from '@vueuse/core'

const MAX_ITEMS = 50

type BackofficeNotificationRow = {
  id: string
  type: 'signalement' | 'reservation'
  entity_id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  read_at: string | null
}

function rowToNotification(row: BackofficeNotificationRow): Notification {
  const icon =
    row.type === 'signalement' ? 'i-lucide-alert-circle' : 'i-lucide-calendar'
  const sender: User = {
    id: 0,
    name: row.title,
    email: '',
    avatar: { icon },
    status: 'subscribed',
    location: '',
  }
  return {
    id: row.id,
    unread: !row.is_read,
    sender,
    body: row.message,
    date: row.created_at,
    type: row.type,
    entity_id: row.entity_id,
    title: row.title,
  }
}

const _useNotifications = () => {
  const { supabase, session } = useSupabase()
  const notifications = ref<Notification[]>([])
  const notificationsError = ref<Error | null>(null)
  let realtimeChannel: RealtimeChannel | null = null

  async function fetchNotifications() {
    if (!supabase || !session.value?.access_token) {
      notifications.value = []
      return
    }
    notificationsError.value = null
    const { data, error } = await supabase
      .from('backoffice_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS)

    if (error) {
      notificationsError.value = new Error(error.message)
      return
    }
    notifications.value = (data as BackofficeNotificationRow[]).map(
      rowToNotification
    )
  }

  function upsertFromRow(row: BackofficeNotificationRow) {
    const n = rowToNotification(row)
    const idx = notifications.value.findIndex((x) => String(x.id) === row.id)
    if (idx === -1) {
      notifications.value = [n, ...notifications.value].slice(0, MAX_ITEMS)
    } else {
      const copy = [...notifications.value]
      copy[idx] = n
      notifications.value = copy
    }
  }

  function removeFromList(id: string) {
    notifications.value = notifications.value.filter(
      (x) => String(x.id) !== id
    )
  }

  function subscribeRealtime() {
    if (!supabase || realtimeChannel) {
      return
    }
    realtimeChannel = supabase
      .channel('backoffice_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'backoffice_notifications',
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id
            if (oldId) {
              removeFromList(oldId)
            }
            return
          }
          if (payload.new) {
            upsertFromRow(payload.new as BackofficeNotificationRow)
          }
        }
      )
      .subscribe()
  }

  function unsubscribeRealtime() {
    if (realtimeChannel && supabase) {
      void supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  async function refreshNotifications() {
    await fetchNotifications()
  }

  async function markAsRead(id: string | number) {
    const idStr = String(id)
    if (supabase && session.value?.access_token) {
      const { error } = await supabase
        .from('backoffice_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', idStr)
      if (error) {
        notificationsError.value = new Error(error.message)
      }
    }
    const list = notifications.value
    const index = list.findIndex((n) => String(n.id) === idStr)
    if (index === -1) {
      return
    }
    const current = list[index]
    if (!current?.unread) {
      return
    }
    const next: Notification[] = [...list]
    next[index] = { ...current, unread: false }
    notifications.value = next
  }

  function clearAll() {
    notifications.value = []
  }

  const unreadCount = computed(() => {
    let n = 0
    for (const item of notifications.value) {
      if (item.unread) {
        n++
      }
    }
    return n
  })

  if (import.meta.client) {
    watch(
      () => session.value?.access_token,
      async (token) => {
        unsubscribeRealtime()
        if (token) {
          await fetchNotifications()
          subscribeRealtime()
        } else {
          notifications.value = []
        }
      },
      { immediate: true }
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
