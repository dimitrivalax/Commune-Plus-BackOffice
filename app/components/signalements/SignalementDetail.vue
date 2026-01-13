<script setup lang="ts">
import { format } from 'date-fns'
import type { Signalement } from '~/types'

const props = defineProps<{
  signalement: Signalement
}>()

const emits = defineEmits<{
  close: []
  update: [signalement: Signalement]
}>()

const toast = useToast()
const { session } = useSupabase()

const localStatus = ref<Signalement['status']>(props.signalement.status)
const localComment = ref<string | null>(props.signalement.comment)
const isSaving = ref(false)

const authHeaders = computed(() => {
  const currentSession = session.value
  if (!currentSession?.access_token) {
    return {}
  }
  return {
    Authorization: `Bearer ${currentSession.access_token}`
  }
})

watch(() => props.signalement, (newSignalement) => {
  localStatus.value = newSignalement.status
  localComment.value = newSignalement.comment
}, { immediate: true })

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

const statusOptions = computed(() => [
  { label: 'En Attente', value: 'en_attente' },
  { label: 'En cours', value: 'en_cours' },
  { label: 'Traité', value: 'traite' }
])

const hasChanges = computed(() => {
  return localStatus.value !== props.signalement.status ||
    localComment.value !== props.signalement.comment
})

const updateSignalement = async () => {
  // Ne rien faire si rien n'a changé
  if (!hasChanges.value) {
    return
  }

  isSaving.value = true
  try {
    const updateBody: { status?: Signalement['status']; comment?: string | null } = {}

    if (localStatus.value !== props.signalement.status) {
      updateBody.status = localStatus.value
    }

    if (localComment.value !== props.signalement.comment) {
      updateBody.comment = localComment.value || null
    }

    const updated = await $fetch<Signalement>(`/api/signalements/${props.signalement.id}`, {
      method: 'PUT',
      body: updateBody,
      headers: authHeaders.value
    })

    // Émettre l'événement pour mettre à jour le signalement dans le parent
    emits('update', updated)

    toast.add({
      title: 'Modifications enregistrées',
      description: 'Le signalement a été mis à jour avec succès',
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Impossible de mettre à jour le signalement',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

const updateStatus = async (newStatus: Signalement['status']) => {
  localStatus.value = newStatus
  await updateSignalement()
}

const dropdownItems = computed(() => [[{
  label: 'Marquer comme En Attente',
  icon: 'i-lucide-clock',
  onSelect: () => updateStatus('en_attente')
}, {
  label: 'Marquer comme En cours',
  icon: 'i-lucide-play-circle',
  onSelect: () => updateStatus('en_cours')
}, {
  label: 'Marquer comme Traité',
  icon: 'i-lucide-check-circle',
  onSelect: () => updateStatus('traite')
}]])
</script>

<template>
  <UDashboardPanel id="signalement-2">
    <UDashboardNavbar :title="`Signalement #${signalement.id.slice(0, 8)}`" :toggle="false">
      <template #leading>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" class="-ms-1.5" @click="emits('close')" />
      </template>

      <template #right>
        <UDropdownMenu :items="dropdownItems">
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" />
        </UDropdownMenu>
      </template>
    </UDashboardNavbar>

    <div class="flex flex-col sm:flex-row justify-between gap-1 p-4 sm:px-6 border-b border-default">
      <div class="flex items-start gap-4 sm:my-1.5">
        <UAvatar :alt="`${signalement.first_name} ${signalement.last_name}`" size="3xl">
          {{ signalement.first_name[0] }}{{ signalement.last_name[0] }}
        </UAvatar>

        <div class="min-w-0">
          <p class="font-semibold text-highlighted">
            {{ signalement.first_name }} {{ signalement.last_name }}
          </p>
          <p v-if="signalement.email" class="text-muted">
            {{ signalement.email }}
          </p>
          <p v-if="signalement.phone" class="text-muted">
            {{ signalement.phone }}
          </p>
        </div>
      </div>

      <div class="max-sm:pl-16 sm:mt-2 flex flex-col items-end gap-2">
        <UBadge :label="getStatusLabel(signalement.status)" :color="getStatusColor(signalement.status)" />
        <p class="text-muted text-sm">
          {{ format(new Date(signalement.created_at), 'dd MMM yyyy HH:mm') }}
        </p>
      </div>
    </div>

    <div class="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
      <!-- Section de gestion du signalement -->
      <div class="bg-default/50 rounded-lg p-4 space-y-4 border border-default">
        <h3 class="font-semibold text-highlighted mb-3">Gestion du signalement</h3>

        <!-- Sélecteur de statut -->
        <UFormField label="Statut" name="status">
          <div class="flex items-center gap-3">
            <USelect v-model="localStatus" :items="statusOptions" placeholder="Sélectionner un statut"
              :disabled="isSaving" class="flex-1" />
            <UBadge :label="getStatusLabel(localStatus)" :color="getStatusColor(localStatus)" />
          </div>
        </UFormField>

        <!-- Zone de réponse -->
        <UFormField label="Réponse au signalement" name="comment">
          <UTextarea v-model="localComment" placeholder="Saisissez votre réponse au signalement..." :rows="4"
            :disabled="isSaving" class="w-full" />
          <template #description>
            Cette réponse sera visible par le citoyen qui a effectué le signalement.
          </template>
        </UFormField>

        <!-- Bouton de sauvegarde -->
        <div class="flex justify-end pt-2">
          <UButton label="Envoyer" icon="i-lucide-send" :disabled="!hasChanges || isSaving" :loading="isSaving"
            @click="updateSignalement" color="primary" />
        </div>
      </div>

      <div v-if="signalement.description">
        <h3 class="font-semibold text-highlighted mb-2">Description</h3>
        <p class="whitespace-pre-wrap">{{ signalement.description }}</p>
      </div>

      <div v-if="signalement.comment">
        <h3 class="font-semibold text-highlighted mb-2">Réponse</h3>
        <p class="whitespace-pre-wrap">{{ signalement.comment }}</p>
      </div>

      <div v-if="signalement.address || (signalement.latitude && signalement.longitude)">
        <h3 class="font-semibold text-highlighted mb-2">Localisation</h3>
        <p v-if="signalement.address" class="mb-2">
          📍 {{ signalement.address }}
        </p>
        <p v-if="signalement.latitude && signalement.longitude" class="text-muted text-sm">
          Coordonnées: {{ signalement.latitude.toFixed(6) }}, {{ signalement.longitude.toFixed(6) }}
        </p>
        <div v-if="signalement.latitude && signalement.longitude" class="mt-2">
          <a :href="`https://www.google.com/maps?q=${signalement.latitude},${signalement.longitude}`" target="_blank"
            rel="noopener noreferrer" class="text-primary hover:underline">
            Voir sur Google Maps
          </a>
        </div>
      </div>

      <div v-if="signalement.photo_url">
        <h3 class="font-semibold text-highlighted mb-2">Photo</h3>
        <img :src="signalement.photo_url" :alt="`Photo du signalement ${signalement.id}`"
          class="max-w-full rounded-lg border border-default" />
      </div>
    </div>
  </UDashboardPanel>
</template>
