<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, EditorToolbarItem } from '@nuxt/ui'
import { ref, reactive, inject, watch } from 'vue'
import { useFacebookPublicationService } from '~/composables/useFacebookPublicationService'

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

function toLocalDatetimeInput(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

function ceilToNextHour(date: Date): Date {
  const rounded = new Date(date)
  rounded.setMinutes(0, 0, 0)
  if (date.getMinutes() !== 0 || date.getSeconds() !== 0 || date.getMilliseconds() !== 0) {
    rounded.setHours(rounded.getHours() + 1)
  }
  return rounded
}

function nextHourLocalInput(): string {
  return toLocalDatetimeInput(ceilToNextHour(new Date()))
}

function normalizeHourlyLocalInput(value: string | undefined): string | undefined {
  if (!value)
    return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()))
    return undefined
  return toLocalDatetimeInput(ceilToNextHour(parsed))
}

const schema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  content: z.string().min(1, 'Le contenu est requis'),
  event_date: z.string().min(1, 'La date de l\'événement est requise'),
  is_scheduled: z.boolean().default(false),
  publish_facebook_scheduled: z.boolean().default(false),
  scheduled_publish_local: z.string().optional(),
  category: z.string().optional(),
  image_url: z
    .union([z.string().url('URL invalide'), z.literal(''), z.undefined()])
    .optional()
})
const open = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    state.event_date = todayISODate()
    state.is_scheduled = false
    state.publish_facebook_scheduled = false
    state.scheduled_publish_local = nextHourLocalInput()
  }
})

type Schema = z.output<typeof schema>

const state = reactive<Omit<Partial<Schema>, 'event_date'> & { event_date: string }>({
  title: undefined,
  content: '',
  event_date: todayISODate(),
  is_scheduled: false,
  publish_facebook_scheduled: false,
  scheduled_publish_local: nextHourLocalInput(),
  category: undefined,
  image_url: undefined
})

const toast = useToast()
const refresh = inject<() => void>('refresh-actualites')
const { currentCommune } = useCurrentCommune()
const { getFacebookStatus } = useFacebookPublicationService()
const isFacebookPublishingEnabled = useFacebookPublishingEnabled()
const { createMunicipalInfo } = useMunicipalInfoService()
const isFacebookConnected = ref(false)

function normalizeScheduledPublishLocal() {
  state.scheduled_publish_local = normalizeHourlyLocalInput(state.scheduled_publish_local) ?? nextHourLocalInput()
}

async function refreshFacebookConnectionStatus() {
  const communeId = currentCommune.value?.id
  if (!communeId) {
    isFacebookConnected.value = false
    return
  }
  try {
    const facebookStatus = await getFacebookStatus(communeId)
    isFacebookConnected.value = Boolean(facebookStatus.connected)
      && facebookStatus.token_status !== 'expired'
      && facebookStatus.token_status !== 'revoked'
  } catch {
    isFacebookConnected.value = false
  }
}

watch(() => open.value, (isOpen) => {
  if (isOpen && isFacebookPublishingEnabled.value) {
    void refreshFacebookConnectionStatus()
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
    await createMunicipalInfo({
      title: event.data.title,
      content: event.data.content,
      event_date: event.data.event_date || todayISODate(),
      category: event.data.category || null,
      image_url: event.data.image_url || null,
      scheduled_publish_at: scheduledPublishAt,
      publish_facebook_scheduled: event.data.is_scheduled
        ? Boolean(event.data.publish_facebook_scheduled)
        : false,
      commune_id: communeId
    })

    toast.add({
      title: 'Succès',
      description: `L'information "${event.data.title}" a été ajoutée`,
      color: 'success'
    })

    state.title = undefined
    state.content = ''
    state.event_date = todayISODate()
    state.is_scheduled = false
    state.publish_facebook_scheduled = false
    state.scheduled_publish_local = nextHourLocalInput()
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
            <UCheckbox
              v-if="isFacebookPublishingEnabled && state.is_scheduled && isFacebookConnected"
              v-model="state.publish_facebook_scheduled"
              label="Programmer aussi la publication sur Facebook"
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
