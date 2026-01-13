<script setup lang="ts">
import { format, isToday } from 'date-fns'
import type { Signalement } from '~/types'

const props = defineProps<{
  signalements: Signalement[]
}>()

const signalementsRefs = ref<Element[]>([])

const selectedSignalement = defineModel<Signalement | null>()

watch(selectedSignalement, () => {
  if (!selectedSignalement.value) {
    return
  }
  const ref = signalementsRefs.value[selectedSignalement.value.id]
  if (ref) {
    ref.scrollIntoView({ block: 'nearest' })
  }
})

defineShortcuts({
  arrowdown: () => {
    const index = props.signalements.findIndex(s => s.id === selectedSignalement.value?.id)

    if (index === -1) {
      selectedSignalement.value = props.signalements[0]
    } else if (index < props.signalements.length - 1) {
      selectedSignalement.value = props.signalements[index + 1]
    }
  },
  arrowup: () => {
    const index = props.signalements.findIndex(s => s.id === selectedSignalement.value?.id)

    if (index === -1) {
      selectedSignalement.value = props.signalements[props.signalements.length - 1]
    } else if (index > 0) {
      selectedSignalement.value = props.signalements[index - 1]
    }
  }
})

const getStatusColor = (status: string) => {
  switch (status) {
    case 'en_attente':
      return 'orange'
    case 'en_cours':
      return 'blue'
    case 'traite':
      return 'green'
    default:
      return 'neutral'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'en_attente':
      return 'En Attente'
    case 'en_cours':
      return 'En cours'
    case 'traite':
      return 'Traité'
    default:
      return status
  }
}

const isUnread = (signalement: Signalement) => {
  return signalement.status === 'en_attente'
}
</script>

<template>
  <div class="overflow-y-auto divide-y divide-default">
    <div
      v-for="(signalement, index) in signalements"
      :key="index"
      :ref="el => { signalementsRefs[signalement.id] = el as Element }"
    >
      <div
        class="p-4 sm:px-6 text-sm cursor-pointer border-l-2 transition-colors"
        :class="[
          isUnread(signalement) ? 'text-highlighted' : 'text-toned',
          selectedSignalement && selectedSignalement.id === signalement.id
            ? 'border-primary bg-primary/10'
            : 'border-(--ui-bg) hover:border-primary hover:bg-primary/5'
        ]"
        @click="selectedSignalement = signalement"
      >
        <div class="flex items-center justify-between" :class="[isUnread(signalement) && 'font-semibold']">
          <div class="flex items-center gap-3">
            {{ signalement.first_name }} {{ signalement.last_name }}

            <UChip v-if="isUnread(signalement)" />
          </div>

          <span>{{ isToday(new Date(signalement.created_at)) ? format(new Date(signalement.created_at), 'HH:mm') : format(new Date(signalement.created_at), 'dd MMM') }}</span>
        </div>
        <p class="truncate" :class="[isUnread(signalement) && 'font-semibold']">
          {{ signalement.description || 'Aucune description' }}
        </p>
        <div class="flex items-center gap-2 mt-1">
          <UBadge :label="getStatusLabel(signalement.status)" :color="getStatusColor(signalement.status)" variant="subtle" />
          <p v-if="signalement.address" class="text-dimmed line-clamp-1">
            📍 {{ signalement.address }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
