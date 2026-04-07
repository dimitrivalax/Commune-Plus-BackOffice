<script setup lang="ts">
import * as z from 'zod'
import type { EditorToolbarItem, FormSubmitEvent } from '@nuxt/ui'

const editorToolbarItems: EditorToolbarItem[] = [
  {
    icon: 'i-lucide-heading',
    tooltip: { text: 'Titres' },
    content: { align: 'start' },
    items: [
      { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: 'Titre 1' },
      { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Titre 2' },
      { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Titre 3' }
    ]
  },
  { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Gras' } },
  { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italique' } },
  { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Barré' } },
  { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: 'Liste à puces' } },
  { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: 'Liste numérotée' } },
  { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Lien' } },
  { kind: 'image', icon: 'i-lucide-image', tooltip: { text: 'Image' } }
]

const schema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().min(1, 'La description est requise'),
  photo_url: z.union([z.string().url('URL invalide'), z.literal(''), z.undefined()]).optional(),
  published: z.boolean()
})
type Schema = z.output<typeof schema>

const open = ref(false)
const state = reactive<Partial<Schema>>({
  title: '',
  description: '',
  photo_url: '',
  published: false
})

const { getAuthHeaders } = useApiAuth()
const { currentCommune } = useCurrentCommune()
const toast = useToast()
const refresh = inject<() => void>('refresh-information-commune')
const isSubmitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!currentCommune.value?.id) {
    toast.add({
      title: 'Erreur',
      description: 'Veuillez sélectionner une commune avant de créer une information',
      color: 'error'
    })
    return
  }

  try {
    isSubmitting.value = true
    await $fetch('/api/information-commune/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        title: event.data.title,
        description: event.data.description,
        photo_url: event.data.photo_url || null,
        published: event.data.published ?? false,
        commune_id: currentCommune.value.id
      }
    })
    toast.add({
      title: 'Succès',
      description: 'Information créée',
      color: 'success'
    })
    state.title = ''
    state.description = ''
    state.photo_url = ''
    state.published = false
    open.value = false
    refresh?.()
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: (error as Error)?.message || 'Une erreur est survenue',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Nouvelle information"
    description="Champs: titre, description, photo"
  >
    <UButton label="Nouvelle information" icon="i-lucide-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Titre" name="title" required>
          <UInput v-model="state.title" class="w-full" />
        </UFormField>

        <UFormField label="Description" name="description" required>
          <ClientOnly>
            <UEditor
              v-if="open"
              v-slot="{ editor }"
              v-model="state.description"
              content-type="html"
              placeholder="Description de l'information"
              class="w-full min-h-[200px] rounded-lg border border-default overflow-hidden"
            >
              <UEditorToolbar
                :editor="editor"
                :items="editorToolbarItems"
                class="border-b border-default"
              />
            </UEditor>
            <template #fallback>
              <div class="h-[250px] w-full rounded-lg border border-default bg-ui-bg-elevated animate-pulse" />
            </template>
          </ClientOnly>
        </UFormField>

        <UFormField label="Photo" name="photo_url">
          <GalleryImagePicker
            v-model="state.photo_url"
            :commune-id="currentCommune?.id"
          />
        </UFormField>

        <UFormField label="Statut" name="published">
          <USwitch v-model="state.published" label="Publié" />
        </UFormField>

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
            type="submit"
            :loading="isSubmitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
