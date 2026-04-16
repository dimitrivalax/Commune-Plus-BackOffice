<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Commune } from '~/types'

const emit = defineEmits<{
  add: [commune: Commune]
}>()

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  postal_code: z.string().min(1, 'Le code postal est requis'),
  email: z.string().email('Email invalide'),
  logo_url: z.string().url('URL invalide').optional().or(z.literal('')),
  date_licence: z.string().optional().or(z.literal('')),
  feature_reservations_salles: z.boolean(),
  feature_propositions: z.boolean()
})

const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  postal_code: undefined,
  email: undefined,
  logo_url: undefined,
  date_licence: undefined,
  feature_reservations_salles: true,
  feature_propositions: true
})

const toast = useToast()
const refresh = inject<() => void>('refresh-communes')
const { getAuthHeaders } = useApiAuth()

function resetForm() {
  state.name = undefined
  state.postal_code = undefined
  state.email = undefined
  state.logo_url = undefined
  state.date_licence = undefined
  state.feature_reservations_salles = true
  state.feature_propositions = true
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    const newCommune = await $fetch<Commune>('/api/communes/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        name: event.data.name,
        postal_code: event.data.postal_code,
        email: event.data.email,
        logo_url: event.data.logo_url || null,
        date_licence: event.data.date_licence || null,
        feature_reservations_salles: event.data.feature_reservations_salles,
        feature_propositions: event.data.feature_propositions
      }
    })

    emit('add', newCommune)

    toast.add({
      title: 'Succès',
      description: `La commune "${event.data.name}" a été créée`,
      color: 'success'
    })

    open.value = false
    resetForm()

    if (refresh) {
      refresh()
    }
  } catch (error: unknown) {
    const message
      = (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string')
        ? error.message
        : 'Une erreur est survenue lors de la création'
    toast.add({
      title: 'Erreur',
      description: message,
      color: 'error'
    })
  }
}

function openModal() {
  resetForm()
  open.value = true
}

defineExpose({
  openModal
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Ajouter une commune"
    description="Créer une nouvelle commune"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Nom"
          placeholder="Venerque"
          name="name"
          required
        >
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField
          label="Code postal"
          placeholder="31810"
          name="postal_code"
          required
        >
          <UInput v-model="state.postal_code" class="w-full" />
        </UFormField>

        <UFormField
          label="Email"
          placeholder="contact@commune.fr"
          name="email"
          required
        >
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>

        <UFormField
          label="Logo URL"
          placeholder="https://example.com/logo.png"
          name="logo_url"
        >
          <UInput v-model="state.logo_url" class="w-full" />
        </UFormField>

        <UFormField
          label="Date de licence"
          name="date_licence"
          help="Date de départ de la licence (format AAAA-MM-JJ)"
        >
          <UInput v-model="state.date_licence" type="date" class="w-full" />
        </UFormField>

        <div class="space-y-3 rounded-lg border border-default p-4">
          <p class="text-sm font-medium text-highlighted">
            Application mobile
          </p>
          <UFormField
            label="Réservation de salles"
            name="feature_reservations_salles"
          >
            <USwitch v-model="state.feature_reservations_salles" />
          </UFormField>
          <UFormField
            label="Propositions"
            name="feature_propositions"
          >
            <USwitch v-model="state.feature_propositions" />
          </UFormField>
        </div>

        <div
          v-if="state.logo_url"
          class="flex justify-center p-4 bg-muted/50 rounded-lg border border-dashed border-default"
        >
          <img
            :src="state.logo_url"
            class="max-h-32 object-contain rounded"
            alt="Aperçu du logo"
            @error="
              (e) => ((e.target as HTMLImageElement).style.display = 'none')
            "
            @load="
              (e) => ((e.target as HTMLImageElement).style.display = 'block')
            "
          >
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            label="Annuler"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Créer"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
