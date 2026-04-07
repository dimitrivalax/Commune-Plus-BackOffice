<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, EditorToolbarItem } from '@nuxt/ui'
import { ref, reactive, inject, watch } from 'vue'

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

function todayISODate(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

const schema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  content: z.string().min(1, 'Le contenu est requis'),
  event_date: z.string().min(1, 'La date de l\'événement est requise'),
  category: z.string().optional(),
  image_url: z
    .union([z.string().url('URL invalide'), z.literal(''), z.undefined()])
    .optional()
})
const open = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    state.event_date = todayISODate()
  }
})

type Schema = z.output<typeof schema>

const state = reactive<Omit<Partial<Schema>, 'event_date'> & { event_date: string }>({
  title: undefined,
  content: '',
  event_date: todayISODate(),
  category: undefined,
  image_url: undefined
})

const toast = useToast()
const refresh = inject<() => void>('refresh-actualites')
const { getAuthHeaders } = useApiAuth()
const { currentCommune } = useCurrentCommune()

watch(open, (isOpen) => {
  if (isOpen) {
    state.event_date = todayISODate()
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  // Utiliser la commune courante si disponible
  const communeId = currentCommune.value?.id

  if (!communeId) {
    toast.add({
      title: 'Erreur',
      description:
        'Veuillez sélectionner une commune dans le menu avant de créer une information',
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
        event_date: event.data.event_date || todayISODate(),
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
    state.content = ''
    state.event_date = todayISODate()
    state.category = undefined
    state.image_url = undefined

    open.value = false

    if (refresh) {
      refresh()
    }
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: (error instanceof Error ? error.message : undefined) || 'Une erreur est survenue lors de l\'ajout',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Nouvelle information"
    description="Ajouter une nouvelle information municipale"
  >
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
          label="Date de l'événement"
          name="event_date"
          required
        >
          <UInput v-model="state.event_date" type="date" class="w-full" />
        </UFormField>

        <UFormField
          label="Contenu"
          placeholder="Contenu de l'information"
          name="content"
          required
        >
          <ClientOnly>
            <UEditor
              v-if="open"
              v-slot="{ editor }"
              v-model="state.content"
              content-type="html"
              placeholder="Contenu de l'information"
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

        <UFormField
          label="Catégorie"
          placeholder="Catégorie (optionnel)"
          name="category"
        >
          <UInput v-model="state.category" class="w-full" />
        </UFormField>

        <UFormField
          label="Image de l'information"
          name="image_url"
        >
          <GalleryImagePicker v-model="state.image_url" />
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
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
