<script setup lang="ts">
import { useNotifications } from '~/composables/useNotifications'

const { isNotificationsSlideoverOpen } = useDashboard()
const { unreadCount } = useNotifications()
</script>

<template>
  <UTooltip text="Notifications" :shortcuts="['N']">
    <UButton
      color="neutral"
      variant="ghost"
      square
      @click="isNotificationsSlideoverOpen = true"
    >
      <UChip color="error" :show="unreadCount > 0" inset>
        <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
      </UChip>
    </UButton>
  </UTooltip>
</template>
