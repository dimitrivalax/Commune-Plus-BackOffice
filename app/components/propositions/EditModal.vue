<script setup lang="ts">
import * as z from 'zod'
import { format } from 'date-fns'
import type { FormSubmitEvent, EditorToolbarItem } from '@nuxt/ui'
import type { Proposition, PropositionComment } from '~/types'
import { getErrorMessage } from '~/utils/errorMessage'

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

const props = defineProps<{ proposition: Proposition | null }>()
const emit = defineEmits<{ delete: [proposition: Proposition] }>()

const schema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  photo_url: z.union([z.string().url('URL invalide'), z.literal(''), z.undefined()]).optional(),
  comments_public: z.boolean().default(true)
})
type Schema = z.output<typeof schema>

const open = ref(false)
const formId = 'proposition-edit-form'
const loading = ref(false)
const submittingComment = ref(false)
const deletingCommentId = ref<string | null>(null)
const newComment = ref('')
const fullProposition = ref<Proposition | null>(null)

const state = reactive<Partial<Schema>>({
  name: undefined,
  description: '',
  photo_url: undefined,
  comments_public: true
})

const toast = useToast()
const refresh = inject<() => void>('refresh-propositions')
const { currentCommune } = useCurrentCommune()
const {
  getProposition,
  updateProposition,
  toggleArchiveProposition,
  duplicateProposition: duplicatePropositionRequest,
  createComment,
  deleteComment: deleteCommentRequest
} = usePropositionsService()

const comments = computed<PropositionComment[]>(() => fullProposition.value?.comments ?? [])

async function fetchDetails() {
  if (!props.proposition) return
  loading.value = true
  try {
    const data = await getProposition(props.proposition.id)
    fullProposition.value = data
    state.name = data.name
    state.description = data.description
    state.photo_url = data.photo_url ?? undefined
    state.comments_public = data.comments_public !== false
  } finally {
    loading.value = false
  }
}

watch(() => props.proposition, (value) => {
  if (!value) return
  state.name = value.name
  state.description = value.description
  state.photo_url = value.photo_url ?? undefined
  state.comments_public = value.comments_public !== false
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.proposition) return
  try {
    await updateProposition(props.proposition.id, {
      name: event.data.name.trim(),
      description: event.data.description.trim(),
      photo_url: event.data.photo_url || null,
      comments_public: event.data.comments_public
    })
    toast.add({ title: 'Succès', description: 'La proposition a été modifiée', color: 'success' })
    await fetchDetails()
    refresh?.()
    open.value = false
  } catch (error: unknown) {
    toast.add({ title: 'Erreur', description: getErrorMessage(error, 'Mise à jour impossible'), color: 'error' })
  }
}

async function toggleArchive() {
  if (!props.proposition) return
  try {
    await toggleArchiveProposition(props.proposition)
    toast.add({
      title: 'Succès',
      description: props.proposition.is_archived ? 'La proposition a été restaurée' : 'La proposition a été archivée',
      color: 'success'
    })
    await fetchDetails()
    refresh?.()
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: getErrorMessage(error, 'Action impossible'),
      color: 'error'
    })
  }
}

async function duplicateProposition() {
  if (!props.proposition) return
  try {
    await duplicatePropositionRequest({
      source: {
        ...props.proposition,
        name: state.name?.trim() || props.proposition.name,
        description: state.description?.trim() || props.proposition.description,
        photo_url: state.photo_url || null,
        comments_public: state.comments_public !== false
      }
    })
    toast.add({ title: 'Succès', description: 'La proposition a été dupliquée', color: 'success' })
    refresh?.()
  } catch (error: unknown) {
    toast.add({ title: 'Erreur', description: getErrorMessage(error, 'Duplication impossible'), color: 'error' })
  }
}

async function publishCommuneComment() {
  if (!props.proposition || !newComment.value.trim()) return
  submittingComment.value = true
  try {
    await createComment(props.proposition.id, newComment.value.trim())
    newComment.value = ''
    await fetchDetails()
  } finally {
    submittingComment.value = false
  }
}

async function deleteComment(commentId: string) {
  if (!props.proposition) return
  deletingCommentId.value = commentId
  try {
    await deleteCommentRequest(props.proposition.id, commentId)
    await fetchDetails()
  } finally {
    deletingCommentId.value = null
  }
}

function openModal(proposition?: Proposition) {
  if (!proposition && !props.proposition) return
  open.value = true
  fetchDetails()
}

function handleDelete() {
  if (!props.proposition) return
  open.value = false
  emit('delete', props.proposition)
}

defineExpose({ openModal })
</script>

<template>
  <UModal v-model:open="open" title="Modifier la proposition" :ui="{ content: 'sm:max-w-5xl w-[95vw] h-[90vh]' }">
    <template #body>
      <div class="space-y-4">
        <UForm
          :id="formId"
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField label="Titre" name="name" required>
            <UInput v-model="state.name" class="w-full" />
          </UFormField>

          <UFormField label="Description" name="description" required>
            <ClientOnly>
              <UEditor
                v-if="open"
                v-slot="{ editor }"
                v-model="state.description"
                content-type="html"
                placeholder="Décrivez la proposition..."
                class="w-full min-h-[180px] rounded-lg border border-default overflow-hidden"
              >
                <UEditorToolbar :editor="editor" :items="editorToolbarItems" class="border-b border-default" />
              </UEditor>
              <template #fallback>
                <div class="h-[220px] w-full rounded-lg border border-default bg-ui-bg-elevated animate-pulse" />
              </template>
            </ClientOnly>
          </UFormField>

          <div class="grid md:grid-cols-2 gap-4">
            <UFormField label="Photo (optionnel)" name="photo_url">
              <GalleryImagePicker v-model="state.photo_url" />
            </UFormField>
            <div class="space-y-2">
              <UFormField label="Visibilité commentaires" name="comments_public">
                <UCheckbox v-model="state.comments_public" label="Commentaires utilisateurs publics" />
              </UFormField>
            </div>
          </div>
        </UForm>

        <div class="border-t border-default my-2" />

        <div class="space-y-3">
          <h4 class="font-medium text-highlighted">
            Commentaires ({{ comments.length }})
          </h4>
          <div v-if="loading" class="text-sm text-muted">
            Chargement...
          </div>
          <div v-else-if="comments.length === 0" class="text-sm text-muted italic">
            Aucun commentaire
          </div>
          <div v-else class="space-y-2 max-h-72 overflow-y-auto">
            <div v-for="comment in comments" :key="comment.id" class="border border-default rounded-lg p-3">
              <div class="flex justify-between gap-2">
                <div class="text-sm font-medium">
                  {{ comment.user_firstname }} {{ comment.user_lastname }}
                </div>
                <div class="text-xs text-muted">
                  {{ format(new Date(comment.created_at), "dd/MM/yyyy HH:mm") }}
                </div>
              </div>
              <p class="text-sm mt-1">
                {{ comment.content }}
              </p>
              <div class="flex justify-end">
                <UButton
                  label="Supprimer"
                  size="xs"
                  color="error"
                  variant="ghost"
                  :loading="deletingCommentId === comment.id"
                  @click="deleteComment(comment.id)"
                />
              </div>
            </div>
          </div>

          <div class="pt-2">
            <p class="text-xs text-muted mb-2">
              Votre commentaire sera affiché sous le nom « Mairie {{ currentCommune?.name ?? '…' }} ».
            </p>
            <div class="flex gap-2 items-end">
              <UTextarea
                v-model="newComment"
                :rows="3"
                class="w-full"
                placeholder="Commenter en tant que mairie..."
              />
              <UButton
                label="Commenter"
                icon="i-lucide-send"
                :disabled="!newComment.trim()"
                :loading="submittingComment"
                @click="publishCommuneComment"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="w-full flex justify-between gap-2">
        <UButton
          label="Supprimer"
          color="error"
          variant="subtle"
          icon="i-lucide-trash"
          @click="handleDelete"
        />
        <div class="flex gap-2">
          <UButton
            :label="props.proposition?.is_archived ? 'Restaurer' : 'Archiver'"
            color="neutral"
            variant="subtle"
            :icon="props.proposition?.is_archived ? 'i-lucide-rotate-ccw' : 'i-lucide-archive'"
            @click="toggleArchive"
          />
          <UButton
            label="Dupliquer"
            color="neutral"
            variant="subtle"
            icon="i-lucide-copy-plus"
            @click="duplicateProposition"
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
            :form="formId"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
