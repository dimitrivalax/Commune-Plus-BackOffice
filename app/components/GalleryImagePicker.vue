<script setup lang="ts">
/**
 * Sélecteur d'image depuis la galerie Cloudinary d'une commune.
 * Utilisé dans AddModal et EditModal pour choisir / ajouter / supprimer des photos.
 * v-model = URL de l'image sélectionnée (ou undefined).
 * communeId optionnel : si fourni, utilise cette commune ; sinon useCurrentCommune().
 */

export interface GalleryImage {
  public_id: string
  secure_url: string
  width: number
  height: number
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    /** Id de la commune dont on affiche la galerie. Si non fourni, utilise la commune courante du layout. */
    communeId?: string | null
    /** Afficher le bloc même quand aucune commune n'est disponible (message d'attente). */
    showWhenNoCommune?: boolean
  }>(),
  { showWhenNoCommune: true }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const { getAuthHeaders } = useApiAuth()
const { session } = useSupabase()
const { currentCommune } = useCurrentCommune()
const toast = useToast()

const effectiveCommuneId = computed(() => props.communeId ?? currentCommune.value?.id ?? null)

const galleryImages = ref<GalleryImage[]>([])
const galleryLoading = ref(false)
const galleryUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const imagePreview = computed(() => {
  const v = props.modelValue
  if (!v || typeof v !== 'string' || v.trim() === '') return null
  try {
    new URL(v)
    return v
  } catch {
    return null
  }
})

async function fetchGallery() {
  const cid = effectiveCommuneId.value
  if (!cid) {
    galleryImages.value = []
    return
  }
  galleryLoading.value = true
  try {
    const data = await $fetch<{ images: GalleryImage[] }>(`/api/gallery/${cid}`, {
      headers: getAuthHeaders()
    })
    galleryImages.value = data.images ?? []
  } catch {
    galleryImages.value = []
  } finally {
    galleryLoading.value = false
  }
}

watch(effectiveCommuneId, (cid) => {
  if (cid) fetchGallery()
  else galleryImages.value = []
}, { immediate: true })

function selectImage(url: string) {
  emit('update:modelValue', url)
}

function triggerFileUpload() {
  fileInputRef.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const cid = effectiveCommuneId.value
  if (!file || !cid) return
  if (!file.type.startsWith('image/')) {
    toast.add({ title: 'Erreur', description: 'Veuillez sélectionner une image', color: 'error' })
    return
  }
  galleryUploading.value = true
  try {
    const formData = new FormData()
    formData.append('commune_id', cid)
    formData.append('file', file)
    // Fallback pour l'auth : certains environnements n'envoient pas Authorization avec FormData
    const token = session.value?.access_token
    if (token) {
      formData.append('access_token', token)
    }
    const result = await $fetch<{ secure_url: string; public_id: string }>('/api/gallery/upload', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })
    await fetchGallery()
    emit('update:modelValue', result.secure_url)
    toast.add({ title: 'Photo ajoutée', description: 'L\'image a été ajoutée à la galerie', color: 'success' })
  } catch (err: unknown) {
    toast.add({
      title: 'Erreur',
      description: (err instanceof Error ? err.message : undefined) || 'Impossible d\'ajouter la photo',
      color: 'error'
    })
  } finally {
    galleryUploading.value = false
  }
}

async function deleteImage(publicId: string, e: Event) {
  e.stopPropagation()
  const wasSelected = props.modelValue && galleryImages.value.some(
    (img) => img.secure_url === props.modelValue && img.public_id === publicId
  )
  try {
    await $fetch('/api/gallery/delete', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: { public_id: publicId }
    })
    galleryImages.value = galleryImages.value.filter((img) => img.public_id !== publicId)
    if (wasSelected) emit('update:modelValue', undefined)
    toast.add({ title: 'Photo supprimée', color: 'success' })
  } catch (err: unknown) {
    toast.add({
      title: 'Erreur',
      description: (err instanceof Error ? err.message : undefined) || 'Impossible de supprimer la photo',
      color: 'error'
    })
  }
}

defineExpose({
  refresh: fetchGallery
})
</script>

<template>
  <div class="gallery-image-picker">
    <p class="text-sm text-muted mb-2">
      {{ effectiveCommuneId === 'commune-plus' ? 'Choisissez une photo dans la galerie Commune Plus, ajoutez-en ou supprimez-en.' : 'Choisissez une photo dans la galerie de la commune, ajoutez-en ou supprimez-en.' }}
    </p>
    <div
      v-if="!effectiveCommuneId && showWhenNoCommune"
      class="rounded-lg border border-default bg-ui-bg-elevated p-4 text-center text-sm text-muted"
    >
      Sélectionnez une commune pour accéder à la galerie.
    </div>
    <template v-else-if="effectiveCommuneId">
      <div class="flex items-center gap-2 mb-2">
        <UButton
          type="button"
          size="sm"
          icon="i-lucide-upload"
          :loading="galleryUploading"
          :disabled="galleryUploading"
          @click="triggerFileUpload"
        >
          Ajouter une photo
        </UButton>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileSelected"
        >
      </div>
      <div
        class="rounded-lg border border-default bg-ui-bg-elevated p-3 overflow-x-auto overflow-y-hidden"
        style="max-height: 220px;"
      >
        <div v-if="galleryLoading" class="flex items-center justify-center py-8 text-muted">
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin" />
        </div>
        <div
          v-else-if="galleryImages.length === 0"
          class="flex items-center justify-center py-8 text-sm text-muted"
        >
          Aucune photo. Ajoutez-en une ci-dessus.
        </div>
        <div
          v-else
          class="flex gap-3 pb-2"
          style="min-height: 140px;"
        >
          <div
            v-for="img in galleryImages"
            :key="img.public_id"
            class="relative shrink-0 group"
          >
            <button
              type="button"
              class="block w-[120px] h-[120px] rounded-lg overflow-hidden border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              :class="modelValue === img.secure_url ? 'border-primary ring-2 ring-primary/20' : 'border-default hover:border-primary/50'"
              @click="selectImage(img.secure_url)"
            >
              <img
                :src="img.secure_url"
                :alt="img.public_id"
                class="w-full h-full object-cover"
                @error="(e: any) => (e.target.style.display = 'none')"
              >
            </button>
            <UButton
              type="button"
              size="xs"
              color="error"
              variant="soft"
              icon="i-lucide-trash-2"
              class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Supprimer"
              @click="deleteImage(img.public_id, $event)"
            />
          </div>
        </div>
      </div>
      <div v-if="imagePreview" class="mt-2">
        <p class="text-sm text-muted mb-1">
          Image sélectionnée :
        </p>
        <img
          :src="imagePreview"
          alt="Aperçu"
          class="max-w-full max-h-40 rounded-lg border border-default object-contain"
          @error="(e: any) => (e.target.style.display = 'none')"
        >
      </div>
    </template>
  </div>
</template>
