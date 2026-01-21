<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  content: z.string().min(1, 'Le contenu est requis'),
  category: z.string().optional(),
  image_url: z.union([
    z.string().url('URL invalide'),
    z.literal(''),
    z.undefined()
  ]).optional()
})
const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  title: undefined,
  content: undefined,
  category: undefined,
  image_url: undefined
})

const toast = useToast()
const refresh = inject<() => void>('refresh-informations')
const { getAuthHeaders } = useApiAuth()
const { currentCommune } = useCurrentCommune()

const imagePreview = computed(() => {
  if (!state.image_url || state.image_url.trim() === '') {
    return null
  }
  try {
    new URL(state.image_url)
    return state.image_url
  } catch {
    return null
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  // Utiliser la commune courante si disponible
  const communeId = currentCommune.value?.id

  if (!communeId) {
    toast.add({
      title: 'Erreur',
      description: 'Veuillez sélectionner une commune dans le menu avant de créer une information',
      color: 'error'
    })
    return
  }

  try {
    await $fetch('/api/municipal-info/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        title: event.data.title,
        content: event.data.content,
        category: event.data.category || null,
        image_url: event.data.image_url || null,
        commune_id: communeId
      }
    })

    toast.add({
      title: 'Succès',
      description: `L'information "${event.data.title}" a été ajoutée`,
      color: 'success'
    })

    state.title = undefined
    state.content = undefined
    state.category = undefined
    state.image_url = undefined

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
  <UModal v-model:open="open" title="Nouvelle information" description="Ajouter une nouvelle information municipale">
    <UButton label="Nouvelle information" icon="i-lucide-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Titre"
          placeholder="Titre de l'information"
          name="title"
          required
        >
          <UInput v-model="state.title" class="w-full" />
        </UFormField>

        <UFormField
          label="Contenu"
          placeholder="Contenu de l'information"
          name="content"
          required
        >
          <UTextarea v-model="state.content" class="w-full" :rows="5" />
        </UFormField>

        <UFormField label="Catégorie" placeholder="Catégorie (optionnel)" name="category">
          <UInput v-model="state.category" class="w-full" />
        </UFormField>

        <UFormField label="URL de l'image" placeholder="https://exemple.com/image.jpg" name="image_url">
          <UInput v-model="state.image_url" class="w-full" />
        </UFormField>

        <div v-if="imagePreview" class="mt-2">
          <p class="text-sm text-muted mb-2">
            Aperçu de l'image :
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
