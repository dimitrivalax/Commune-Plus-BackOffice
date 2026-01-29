<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, EditorToolbarItem } from '@nuxt/ui'
import type { MunicipalInfo } from '~/types'

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

const props = defineProps<{
  info: MunicipalInfo | null
}>()

const schema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  content: z.string().min(1, 'Le contenu est requis'),
  category: z.string().optional(),
  image_url: z
    .union([z.string().url('URL invalide'), z.literal(''), z.undefined()])
    .optional()
})

const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  title: undefined,
  content: '',
  category: undefined,
  image_url: undefined
})

watch(
  () => props.info,
  (newInfo) => {
    if (newInfo) {
      state.title = newInfo.title
      state.content = newInfo.content
      state.category = newInfo.category || undefined
      state.image_url = newInfo.image_url || undefined
    }
  },
  { immediate: true }
)

const toast = useToast()
const refresh = inject<() => void>('refresh-informations')
const { getAuthHeaders } = useApiAuth()
const { currentCommune } = useCurrentCommune()

const emit = defineEmits<{
  delete: [info: MunicipalInfo]
}>()

const isPublishing = ref(false)

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
  if (!props.info) return

  try {
    await $fetch(`/api/municipal-info/${props.info.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: {
        title: event.data.title,
        content: event.data.content,
        category: event.data.category || null,
        image_url: event.data.image_url || null
      }
    })

    toast.add({
      title: 'Succès',
      description: `L'information "${event.data.title}" a été modifiée`,
      color: 'success'
    })

    open.value = false

    if (refresh) {
      refresh()
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description:
        error.message || 'Une erreur est survenue lors de la modification',
      color: 'error'
    })
  }
}

async function handleDelete() {
  if (!props.info) return

  open.value = false
  emit('delete', props.info)
}

async function handlePublish() {
  if (!props.info) return

  // Utiliser la commune_id de l'information si disponible, sinon la commune courante
  const communeId = props.info.commune_id || currentCommune.value?.id

  if (!communeId) {
    toast.add({
      title: 'Erreur',
      description:
        'Aucune commune associée à cette information. Veuillez sélectionner une commune dans le menu ou associer cette information à une commune.',
      color: 'error'
    })
    return
  }

  isPublishing.value = true

  try {
    await $fetch(`/api/municipal-info/${props.info.id}/publish`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        commune_id: communeId
      }
    })

    toast.add({
      title: 'Succès',
      description: 'La notification a été envoyée aux utilisateurs',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description:
        error.message
        || 'Une erreur est survenue lors de l\'envoi de la notification',
      color: 'error'
    })
  } finally {
    isPublishing.value = false
  }
}

function openModal(info?: MunicipalInfo) {
  const targetInfo = info || props.info
  if (targetInfo) {
    state.title = targetInfo.title
    state.content = targetInfo.content
    state.category = targetInfo.category || undefined
    state.image_url = targetInfo.image_url || undefined
    open.value = true
  }
}

defineExpose({
  openModal
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Modifier l'information"
    description="Modifier une information municipale"
  >
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
          label="URL de l'image"
          placeholder="https://exemple.com/image.jpg"
          name="image_url"
        >
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
            @error="(e: any) => (e.target.style.display = 'none')"
          >
        </div>

        <div class="flex justify-between gap-2 pt-2">
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
              variant="solid"
              type="submit"
            />
            <UButton
              label="Publier"
              color="success"
              variant="solid"
              icon="i-lucide-send"
              :loading="isPublishing"
              :disabled="isPublishing"
              @click="handlePublish"
            />
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
