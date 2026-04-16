<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, EditorToolbarItem } from '@nuxt/ui'
import type { MunicipalInfo } from '~/types'
import { getErrorMessage } from '~/utils/errorMessage'

const CATEGORY_INFO_GENERALE = 'Information Générale'

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
  event_date: z.string().optional(),
  image_url: z
    .union([z.string().url('URL invalide'), z.literal(''), z.undefined()])
    .optional()
})

const open = ref(false)

type Schema = z.output<typeof schema>

function toDateOnly(isoOrDate: string | null | undefined): string | undefined {
  if (!isoOrDate) return undefined
  return isoOrDate.split('T')[0]
}

const state = reactive<Partial<Schema>>({
  title: undefined,
  content: '',
  event_date: undefined,
  image_url: undefined
})

watch(
  () => props.info,
  (newInfo) => {
    if (newInfo) {
      state.title = newInfo.title
      state.content = newInfo.content
      state.event_date = toDateOnly(newInfo.event_date ?? null) ?? undefined
      state.image_url = newInfo.image_url || undefined
    }
  },
  { immediate: true }
)

const toast = useToast()
const refresh = inject<() => void>('refresh-notifications')
const { updateMunicipalInfo } = useMunicipalInfoService()
const { publish, isPublishing } = usePublishMunicipalInfo({
  onSuccess: () => refresh?.(),
  global: true
})

const emit = defineEmits<{
  delete: [info: MunicipalInfo]
}>()

// Galerie globale pour les notifications (Information Générale)
const galleryCommuneId = 'commune-plus'

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.info) return

  try {
    await updateMunicipalInfo({
      id: props.info.id,
      title: event.data.title,
      content: event.data.content,
      event_date: event.data.event_date || null,
      category: CATEGORY_INFO_GENERALE,
      image_url: event.data.image_url || null,
      scheduled_publish_at: null
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
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: getErrorMessage(error, 'Une erreur est survenue lors de la modification'),
      color: 'error'
    })
  }
}

async function handleDelete() {
  if (!props.info) return

  open.value = false
  emit('delete', props.info)
}

function handlePublish() {
  if (!props.info) return
  publish(props.info)
}

function openModal(info?: MunicipalInfo) {
  const targetInfo = info || props.info
  if (targetInfo) {
    state.title = targetInfo.title
    state.content = targetInfo.content
    state.event_date = toDateOnly(targetInfo.event_date ?? null) ?? undefined
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
    title="Modifier la notification"
    description="Modifier une information générale (tous les utilisateurs)"
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
          label="Date de l'événement"
          name="event_date"
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
          label="Image de l'information"
          name="image_url"
        >
          <GalleryImagePicker
            v-model="state.image_url"
            :commune-id="galleryCommuneId"
          />
        </UFormField>

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
              label="Publier (tous les utilisateurs)"
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
