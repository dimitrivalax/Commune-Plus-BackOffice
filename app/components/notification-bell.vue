<script setup lang="ts">
const { isNotificationsSlideoverOpen } = useDashboard()
const { unreadCount } = useNotifications()

const badgeLabel = computed(() =>
  unreadCount.value > 99 ? '99+' : String(unreadCount.value)
)
</script>

<template>
  <UTooltip text="Notifications" :shortcuts="['N']">
    <UButton
      color="neutral"
      variant="ghost"
      square
      @click="isNotificationsSlideoverOpen = true"
    >
      <span class="relative inline-flex items-center justify-center">
        <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
        <UBadge
          v-if="unreadCount > 0"
          :label="badgeLabel"
          color="error"
          size="xs"
          class="absolute -right-2 -top-2 min-w-5 justify-center px-1 py-0 text-[10px] leading-3 tabular-nums"
        />
      </span>
    </UButton>
  </UTooltip>
</template>
