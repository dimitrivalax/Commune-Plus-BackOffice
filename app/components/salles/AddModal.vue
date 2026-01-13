<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  adresse: z.string().min(1, 'L\'adresse est requise'),
  nombre_max_places: z.number().int().positive('Le nombre de places doit être positif'),
  description: z.string().optional(),
  photo_url: z.union([
    z.string().url('URL invalide'),
    z.literal(''),
    z.undefined()
  ]).optional()
})
const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  nom: undefined,
  adresse: undefined,
  nombre_max_places: undefined,
  description: undefined,
  photo_url: undefined
})

const toast = useToast()
const refresh = inject<() => void>('refresh-salles')
const { getAuthHeaders } = useApiAuth()

const imagePreview = computed(() => {
  if (!state.photo_url || state.photo_url.trim() === '') {
    return null
  }
  try {
    new URL(state.photo_url)
    return state.photo_url
  } catch {
    return null
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await $fetch('/api/salles/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        nom: event.data.nom,
        adresse: event.data.adresse,
        nombre_max_places: event.data.nombre_max_places,
        description: event.data.description || null,
        photo_url: event.data.photo_url || null
      }
    })

    toast.add({
      title: 'Succès',
      description: `La salle "${event.data.nom}" a été ajoutée`,
      color: 'success'
    })

    state.nom = undefined
    state.adresse = undefined
    state.nombre_max_places = undefined
    state.description = undefined
    state.photo_url = undefined

    open.value = false

    if (refresh) {
      refresh()
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue lors de l\'ajout',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Nouvelle salle" description="Ajouter une nouvelle salle municipale">
    <UButton label="Nouvelle salle" icon="i-lucide-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Nom"
          placeholder="Nom de la salle"
          name="nom"
          required
        >
          <UInput v-model="state.nom" class="w-full" />
        </UFormField>

        <UFormField
          label="Adresse"
          placeholder="Adresse de la salle"
          name="adresse"
          required
        >
          <UInput v-model="state.adresse" class="w-full" />
        </UFormField>

        <UFormField
          label="Nombre maximum de places"
          placeholder="50"
          name="nombre_max_places"
          required
        >
          <UInput v-model.number="state.nombre_max_places" type="number" class="w-full" />
        </UFormField>

        <UFormField label="Description" placeholder="Description de la salle (optionnel)" name="description">
          <UTextarea v-model="state.description" class="w-full" :rows="3" />
        </UFormField>

        <UFormField label="URL de la photo" placeholder="https://exemple.com/photo.jpg" name="photo_url">
          <UInput v-model="state.photo_url" class="w-full" />
        </UFormField>

        <div v-if="imagePreview" class="mt-2">
          <p class="text-sm text-muted mb-2">
            Aperçu de la photo :
          </p>
          <img
            :src="imagePreview"
            alt="Preview"
            class="max-w-full max-h-64 rounded-lg border border-default object-contain"
            @error="(e: any) => e.target.style.display = 'none'"
          >
        </div>

        <div class="flex justify-end gap-2">
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
