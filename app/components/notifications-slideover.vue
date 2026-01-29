<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import type { Notification } from '~/types'

const { isNotificationsSlideoverOpen } = useDashboard()
const router = useRouter()
const { session } = useSupabase()

// Utiliser le composable pour les notifications
const { notifications, refreshNotifications, notificationsError, unreadCount } = useNotifications()

// Fonction pour obtenir l'URL de navigation selon le type de notification
const getNotificationUrl = (notification: Notification) => {
  if (notification.type === 'signalement') {
    return '/signalements'
  } else if (notification.type === 'reservation') {
    return '/reservations-salles'
  }
  return '/'
}

// Fonction pour marquer une notification comme lue et naviguer
const handleNotificationClick = async (notification: Notification) => {
  // Si la notification n'est pas encore lue, la marquer comme lue
  if (notification.unread) {
    try {
      const authHeaders: Record<string, string> = {}
      if (session.value?.access_token) {
        authHeaders.Authorization = `Bearer ${session.value.access_token}`
      }

      await $fetch(`/api/notifications/${notification.id}/read`, {
        method: 'PUT',
        headers: authHeaders
      })

      // Rafraîchir la liste des notifications
      await refreshNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Naviguer vers la page appropriée
  const url = getNotificationUrl(notification)
  router.push(url)

  // Fermer le slideover
  isNotificationsSlideoverOpen.value = false
}

// Charger les notifications quand le slideover s'ouvre
watch(isNotificationsSlideoverOpen, (isOpen) => {
  if (isOpen && session.value?.access_token) {
    refreshNotifications()
  }
})
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    title="Notifications"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="text-lg font-semibold">
          Notifications
        </h3>
        <UBadge v-if="unreadCount > 0" :label="unreadCount" color="error" />
      </div>
    </template>

    <template #body>
      <div v-if="notificationsError" class="px-3 py-8 text-center text-error">
        <p>
          Erreur lors du chargement des notifications
        </p>
        <p class="text-sm text-muted mt-2">
          {{
            notificationsError.message || 'Veuillez réessayer'
          }}
        </p>
      </div>
      <div v-else-if="!notifications || notifications.length === 0" class="px-3 py-8 text-center text-muted">
        <p>Aucune notification</p>
      </div>

      <button
        v-for="notification in notifications"
        :key="notification.id"
        class="w-full px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-center gap-3 relative -mx-3 first:-mt-3 last:-mb-3 text-left transition-colors"
        @click="handleNotificationClick(notification)"
      >
        <UChip
          color="error"
          :show="!!notification.unread"
          inset
        >
          <UAvatar
            v-bind="notification.sender.avatar"
            :alt="notification.sender.name"
            size="md"
          />
        </UChip>

        <div class="text-sm flex-1">
          <p class="flex items-center justify-between">
            <span class="text-highlighted font-medium">{{ notification.title || notification.sender.name }}</span>

            <time
              :datetime="notification.date"
              class="text-muted text-xs"
              v-text="formatTimeAgo(new Date(notification.date))"
            />
          </p>

          <p class="text-dimmed">
            {{ notification.body }}
          </p>
        </div>
      </button>
    </template>
  </USlideover>
</template>
