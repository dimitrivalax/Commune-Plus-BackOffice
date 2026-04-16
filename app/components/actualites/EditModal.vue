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
  event_date: z.string().optional(),
  is_scheduled: z.boolean().default(false),
  scheduled_publish_local: z.string().optional(),
  category: z.string().optional(),
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

function toLocalDatetimeInput(isoOrDate: string | Date | null | undefined): string | undefined {
  if (!isoOrDate) return undefined
  const parsed = new Date(isoOrDate)
  if (Number.isNaN(parsed.getTime())) return undefined
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

function ceilToNextHour(date: Date): Date {
  const rounded = new Date(date)
  rounded.setMinutes(0, 0, 0)
  if (date.getMinutes() !== 0 || date.getSeconds() !== 0 || date.getMilliseconds() !== 0) {
    rounded.setHours(rounded.getHours() + 1)
  }
  return rounded
}

function normalizeHourlyLocalInput(value: string | undefined): string | undefined {
  if (!value)
    return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()))
    return undefined
  return toLocalDatetimeInput(ceilToNextHour(parsed))
}

const state = reactive<Partial<Schema>>({
  title: undefined,
  content: '',
  event_date: undefined,
  is_scheduled: false,
  scheduled_publish_local: undefined,
  category: undefined,
  image_url: undefined
})

watch(
  () => props.info,
  (newInfo) => {
    if (newInfo) {
      state.title = newInfo.title
      state.content = newInfo.content
      state.event_date = toDateOnly(newInfo.event_date ?? null) ?? undefined
      state.is_scheduled = newInfo.publication_status === 'scheduled'
      state.scheduled_publish_local = toLocalDatetimeInput(newInfo.scheduled_publish_at)
      state.category = newInfo.category || undefined
      state.image_url = newInfo.image_url || undefined
    }
  },
  { immediate: true }
)

const toast = useToast()
const refresh = inject<() => void>('refresh-actualites')
const { currentCommune } = useCurrentCommune()
const { publish, isPublishing } = usePublishMunicipalInfo({ onSuccess: () => refresh?.() })
const { updateMunicipalInfo, duplicateMunicipalInfo } = useMunicipalInfoService()
const isDuplicating = ref(false)

function normalizeScheduledPublishLocal() {
  state.scheduled_publish_local = normalizeHourlyLocalInput(state.scheduled_publish_local)
}

const emit = defineEmits<{
  delete: [info: MunicipalInfo]
}>()

const galleryCommuneId = computed(() => props.info?.commune_id ?? currentCommune.value?.id ?? null)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.info) return

  let scheduledPublishAt: string | null = null
  if (event.data.is_scheduled) {
    const normalizedLocal = normalizeHourlyLocalInput(event.data.scheduled_publish_local)
    if (!normalizedLocal) {
      toast.add({
        title: 'Erreur',
        description: 'Veuillez sélectionner une heure de publication.',
        color: 'error'
      })
      return
    }
    state.scheduled_publish_local = normalizedLocal
    const parsed = new Date(normalizedLocal)
    if (Number.isNaN(parsed.getTime())) {
      toast.add({
        title: 'Erreur',
        description: 'La date de publication programmée est invalide.',
        color: 'error'
      })
      return
    }
    scheduledPublishAt = parsed.toISOString()
  }

  try {
    await updateMunicipalInfo({
      id: props.info.id,
      title: event.data.title,
      content: event.data.content,
      event_date: event.data.event_date || null,
      category: event.data.category || null,
      image_url: event.data.image_url || null,
      scheduled_publish_at: scheduledPublishAt
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
    const message = error instanceof Error
      ? error.message
      : 'Une erreur est survenue lors de la modification'
    toast.add({
      title: 'Erreur',
      description: message,
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

async function handleDuplicate() {
  if (!props.info) return

  isDuplicating.value = true
  try {
    await duplicateMunicipalInfo({
      source: props.info,
      title: state.title || props.info.title,
      content: state.content || props.info.content,
      event_date: state.event_date || null,
      category: state.category || null,
      image_url: state.image_url || null
    })

    toast.add({
      title: 'Succès',
      description: 'L’actualité a été dupliquée',
      color: 'success'
    })

    refresh?.()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Duplication impossible'
    toast.add({
      title: 'Erreur',
      description: message,
      color: 'error'
    })
  } finally {
    isDuplicating.value = false
  }
}

function openModal(info?: MunicipalInfo) {
  const targetInfo = info || props.info
  if (targetInfo) {
    state.title = targetInfo.title
    state.content = targetInfo.content
    state.event_date = toDateOnly(targetInfo.event_date ?? null) ?? undefined
    state.is_scheduled = targetInfo.publication_status === 'scheduled'
    state.scheduled_publish_local = toLocalDatetimeInput(targetInfo.scheduled_publish_at)
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
          label="Date de l'événement"
          name="event_date"
        >
          <UInput v-model="state.event_date" type="date" class="w-full" />
        </UFormField>

        <UFormField
          label="Publication programmée"
          name="is_scheduled"
        >
          <div class="space-y-2">
            <UCheckbox
              v-model="state.is_scheduled"
              label="Programmer la publication"
            />
            <UInput
              v-if="state.is_scheduled"
              v-model="state.scheduled_publish_local"
              type="datetime-local"
              :step="3600"
              class="w-full"
              @change="normalizeScheduledPublishLocal"
              @blur="normalizeScheduledPublishLocal"
            />
          </div>
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
              label="Dupliquer"
              color="neutral"
              variant="subtle"
              icon="i-lucide-copy-plus"
              :loading="isDuplicating"
              :disabled="isDuplicating"
              type="button"
              @click="handleDuplicate"
            />
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
              label="Publier maintenant"
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
