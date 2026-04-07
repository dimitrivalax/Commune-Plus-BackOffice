<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import type { Notification } from '~/types'
import { useNotifications } from '~/composables/useNotifications'

const { isNotificationsSlideoverOpen } = useDashboard()
const router = useRouter()

const { notifications, refreshNotifications, markAsRead, notificationsError, unreadCount } = useNotifications()

const unreadNotifications = computed(() =>
  notifications.value.filter((n) => n.unread)
)

function getNotificationUrl(notification: Notification) {
  if (notification.type === 'signalement') {
    return '/signalements'
  }
  if (notification.type === 'reservation') {
    return '/reservations-salles'
  }
  return '/'
}

function handleNotificationClick(notification: Notification) {
  if (notification.unread) {
    markAsRead(notification.id)
  }
  router.push(getNotificationUrl(notification))
  isNotificationsSlideoverOpen.value = false
}

watch(isNotificationsSlideoverOpen, (isOpen) => {
  if (isOpen) {
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
          {{ notificationsError?.message || 'Veuillez réessayer' }}
        </p>
      </div>
      <div v-else-if="unreadNotifications.length === 0" class="px-3 py-8 text-center text-muted">
        <p>Aucune notification non lue</p>
      </div>

      <button
        v-for="notification in unreadNotifications"
        :key="notification.id"
        class="w-full px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-center gap-3 relative -mx-3 first:-mt-3 last:-mb-3 text-left transition-colors"
        @click="handleNotificationClick(notification)"
      >
        <UChip color="error" :show="true" inset>
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
