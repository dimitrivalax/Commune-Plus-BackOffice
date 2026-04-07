<script setup lang="ts">
import * as z from 'zod'
import type { EditorToolbarItem, FormSubmitEvent } from '@nuxt/ui'

interface CommuneInformation {
  id: string
  title: string
  description: string
  photo_url?: string | null
  commune_id?: string | null
  ordre_affichage?: number
  published?: boolean
}

const props = defineProps<{
  info: CommuneInformation | null
}>()

const emit = defineEmits<{
  delete: [info: CommuneInformation]
}>()

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
const isSubmitting = ref(false)

const { getAuthHeaders } = useApiAuth()
const toast = useToast()
const refresh = inject<() => void>('refresh-information-commune')

function openModal(info?: CommuneInformation) {
  const target = info || props.info
  if (!target) return
  state.title = target.title
  state.description = target.description
  state.photo_url = target.photo_url ?? ''
  state.published = target.published ?? false
  open.value = true
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.info) return
  try {
    isSubmitting.value = true
    await $fetch(`/api/information-commune/${props.info.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: {
        title: event.data.title,
        description: event.data.description,
        photo_url: event.data.photo_url || null,
        published: event.data.published ?? false
      }
    })
    toast.add({
      title: 'Succès',
      description: 'Information modifiée',
      color: 'success'
    })
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

function handleDelete() {
  if (!props.info) return
  open.value = false
  emit('delete', props.info)
}

defineExpose({
  openModal
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Modifier l'information"
    description="Mettre à jour cette information communale"
  >
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
            :commune-id="props.info?.commune_id"
          />
        </UFormField>

        <UFormField label="Statut" name="published">
          <USwitch v-model="state.published" label="Publié" />
        </UFormField>

        <div class="flex justify-between gap-2">
          <UButton
            label="Supprimer"
            color="error"
            variant="subtle"
            icon="i-lucide-trash"
            @click="handleDelete"
          />
          <div class="flex gap-2">
            <UButton
              label="Annuler"
              color="neutral"
              variant="subtle"
              @click="open = false"
            />
            <UButton
              label="Enregistrer"
              color="primary"
              type="submit"
              :loading="isSubmitting"
            />
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
