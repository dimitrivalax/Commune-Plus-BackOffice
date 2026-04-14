<script setup lang="ts">
import { format } from "date-fns";
import type { Proposition } from "~/types";

const props = defineProps<{
  proposition: Proposition;
}>();

const emits = defineEmits<{
  close: [];
  update: [proposition: Proposition];
  duplicated: [proposition: Proposition];
}>();

const toast = useToast();
const { session } = useSupabase();
const { currentCommune } = useCurrentCommune();

const isArchiving = ref(false);
const fullProposition = ref<Proposition | null>(null);
const loading = ref(false);
const newComment = ref("");
const isSubmittingComment = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const isDuplicating = ref(false);
const isImageModalOpen = ref(false);
const isDeletingCommentId = ref<string | null>(null);
const editName = ref("");
const editDescription = ref("");
const editCommentsPublic = ref(true);

const authHeaders = computed(() => {
  const currentSession = session.value;
  const headers: Record<string, string> = {};
  if (currentSession?.access_token) {
    headers.Authorization = `Bearer ${currentSession.access_token}`;
  }
  return headers;
});

const fetchDetails = async () => {
  loading.value = true;
  try {
    const data = await $fetch<Proposition>(
      `/api/propositions/${props.proposition.id}`,
      {
        headers: authHeaders.value,
      },
    );
    fullProposition.value = data;
    editName.value = data.name ?? "";
    editDescription.value = data.description ?? "";
    editCommentsPublic.value = data.comments_public !== false;
  } catch (error) {
    console.error("Error fetching proposition details:", error);
  } finally {
    loading.value = false;
  }
};

watch(() => props.proposition.id, fetchDetails, { immediate: true });

const toggleArchive = async () => {
  isArchiving.value = true;
  try {
    const updated = await $fetch<Proposition>(
      `/api/propositions/${props.proposition.id}`,
      {
        method: "PUT",
        body: { is_archived: !props.proposition.is_archived },
        headers: authHeaders.value,
      },
    );

    emits("update", updated);

    toast.add({
      title: updated.is_archived ? "Proposition archivée" : "Proposition restaurée",
      icon: "i-lucide-check-circle",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Erreur",
      description: error.message || "Action impossible",
      icon: "i-lucide-alert-circle",
      color: "error",
    });
  } finally {
    isArchiving.value = false;
  }
};

const submitMairieComment = async () => {
  const content = newComment.value?.trim();
  if (!content) return;

  isSubmittingComment.value = true;
  try {
    await $fetch(`/api/propositions/${props.proposition.id}/comments`, {
      method: "POST",
      body: { content },
      headers: authHeaders.value,
    });
    toast.add({
      title: "Commentaire publié",
      icon: "i-lucide-check-circle",
      color: "success",
    });
    newComment.value = "";
    await fetchDetails();
  } catch (error: any) {
    toast.add({
      title: "Erreur",
      description: error?.data?.message || error.message || "Impossible de publier le commentaire",
      icon: "i-lucide-alert-circle",
      color: "error",
    });
  } finally {
    isSubmittingComment.value = false;
  }
};

const isMairieComment = (comment: { user_firstname: string; user_email?: string }) =>
  comment.user_firstname === "Mairie" || comment.user_email === "mairie@commune";

const saveProposition = async () => {
  isSaving.value = true;
  try {
    const updated = await $fetch<Proposition>(`/api/propositions/${props.proposition.id}`, {
      method: "PUT",
      body: {
        name: editName.value.trim(),
        description: editDescription.value.trim(),
        comments_public: editCommentsPublic.value,
      },
      headers: authHeaders.value,
    });
    emits("update", updated);
    fullProposition.value = { ...fullProposition.value, ...updated };
    toast.add({
      title: "Proposition mise à jour",
      icon: "i-lucide-check-circle",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Erreur",
      description: error?.data?.message || error.message || "Enregistrement impossible",
      icon: "i-lucide-alert-circle",
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
};

const deleteProposition = async () => {
  isDeleting.value = true;
  try {
    await $fetch(`/api/propositions/${props.proposition.id}`, {
      method: "DELETE",
      headers: authHeaders.value,
    });
    emits("close");
    toast.add({
      title: "Proposition supprimée",
      icon: "i-lucide-check-circle",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Erreur",
      description: error?.data?.message || error.message || "Suppression impossible",
      icon: "i-lucide-alert-circle",
      color: "error",
    });
  } finally {
    isDeleting.value = false;
  }
};

const deleteComment = async (commentId: string) => {
  isDeletingCommentId.value = commentId;
  try {
    await $fetch(`/api/propositions/${props.proposition.id}/comments/${commentId}`, {
      method: "DELETE",
      headers: authHeaders.value,
    });
    await fetchDetails();
  } finally {
    isDeletingCommentId.value = null;
  }
};

const duplicateProposition = async () => {
  const communeId = fullProposition.value?.commune_id ?? props.proposition.commune_id;
  if (!communeId) return;
  isDuplicating.value = true;
  try {
    const duplicate = await $fetch<Proposition>("/api/propositions", {
      method: "POST",
      headers: authHeaders.value,
      body: {
        commune_id: communeId,
        name: `${editName.value.trim()} (copie)`,
        description: editDescription.value.trim(),
        photo_url: fullProposition.value?.photo_url ?? props.proposition.photo_url ?? null,
        comments_public: editCommentsPublic.value,
      },
    });
    emits("duplicated", duplicate);
    toast.add({
      title: "Proposition dupliquée",
      icon: "i-lucide-copy-plus",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Erreur",
      description: error?.data?.message || error.message || "Duplication impossible",
      icon: "i-lucide-alert-circle",
      color: "error",
    });
  } finally {
    isDuplicating.value = false;
  }
};
</script>

<template>
  <UDashboardPanel
    id="proposition-detail"
    :ui="{
      root: 'relative flex flex-col min-w-0 h-full !min-h-0 overflow-hidden shrink',
      body: 'flex flex-col gap-4 sm:gap-6 flex-1 min-h-0 overflow-hidden p-0',
    }"
  >
    <UDashboardNavbar :title="`Proposition #${proposition.id.slice(0, 8)}`" :toggle="false">
      <template #leading>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" class="-ms-1.5" @click="emits('close')" />
      </template>

      <template #right>
        <UButton :label="proposition.is_archived ? 'Restaurer' : 'Archiver'" :icon="proposition.is_archived ? 'i-lucide-rotate-ccw' : 'i-lucide-archive'
          " color="neutral" variant="ghost" @click="toggleArchive" :loading="isArchiving" />
      </template>
    </UDashboardNavbar>

    <div class="flex flex-col sm:flex-row justify-between gap-1 p-4 sm:px-6 border-b border-default">
      <div class="flex items-start gap-4 sm:my-1.5">
        <UAvatar :alt="`${proposition.user_firstname} ${proposition.user_lastname}`" size="3xl">
          {{ proposition.user_firstname[0] }}{{ proposition.user_lastname[0] }}
        </UAvatar>

        <div class="min-w-0">
          <p class="font-semibold text-highlighted">
            {{ proposition.user_firstname }} {{ proposition.user_lastname }}
          </p>
          <p class="text-muted text-sm">{{ proposition.user_email }}</p>
        </div>
      </div>

      <div class="max-sm:pl-16 sm:mt-2 flex flex-col items-end gap-2">
        <UBadge :label="proposition.is_archived ? 'Archivée' : 'Active'"
          :color="proposition.is_archived ? 'neutral' : 'success'" variant="subtle" />
        <p class="text-muted text-sm">
          {{ format(new Date(proposition.created_at), "dd MMM yyyy HH:mm") }}
        </p>
        <p class="text-primary font-bold flex items-center gap-2">
          <UIcon name="i-lucide-thumbs-up" />
          {{ proposition.votes_count }} votes
        </p>
      </div>
    </div>

    <div class="min-h-0 flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
      <div class="space-y-3 p-4 border border-default rounded-lg bg-default/20">
        <h3 class="font-semibold text-highlighted">Gestion de la proposition</h3>
        <UInput v-model="editName" placeholder="Titre" />
        <UTextarea v-model="editDescription" :rows="4" placeholder="Description" />
        <UCheckbox v-model="editCommentsPublic" label="Commentaires utilisateurs publics" />
        <div class="flex justify-between gap-2">
          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-copy-plus"
              label="Dupliquer"
              :loading="isDuplicating"
              :disabled="!editName.trim() || !editDescription.trim()"
              @click="duplicateProposition"
            />
            <UButton
              color="error"
              variant="outline"
              icon="i-lucide-trash-2"
              label="Supprimer"
              :loading="isDeleting"
              @click="deleteProposition"
            />
          </div>
          <UButton
            color="primary"
            icon="i-lucide-save"
            label="Enregistrer"
            :loading="isSaving"
            :disabled="!editName.trim() || !editDescription.trim()"
            @click="saveProposition"
          />
        </div>
      </div>

      <div>
        <h1 class="text-2xl font-bold text-highlighted mb-4">
          {{ proposition.name }}
        </h1>
        <p class="whitespace-pre-wrap text-toned leading-relaxed">
          {{ proposition.description }}
        </p>
      </div>

      <div v-if="proposition.photo_url">
        <h3 class="font-semibold text-highlighted mb-2 flex items-center gap-2">
          <UIcon name="i-lucide-image" />
          Photo
        </h3>
        <img
          :src="proposition.photo_url"
          class="h-48 w-48 object-cover rounded-xl border border-default shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
          @click="isImageModalOpen = true"
        />
      </div>

      <UDivider />

      <div class="space-y-4">
        <h3 class="font-semibold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-message-square" />
          Commentaires ({{ fullProposition?.comments?.length || 0 }})
        </h3>

        <div v-if="loading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-8 text-dimmed" />
        </div>

        <div v-else-if="fullProposition?.comments?.length" class="space-y-4">
          <div v-for="comment in fullProposition.comments" :key="comment.id"
            class="bg-default/30 rounded-lg p-4 border border-default">
            <div class="flex justify-between items-start mb-2">
              <div>
                <span class="font-semibold text-sm">{{ comment.user_firstname }}
                  {{ comment.user_lastname }}</span>
                <p v-if="!isMairieComment(comment)" class="text-xs text-muted">{{ comment.user_email }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">{{
                  format(new Date(comment.created_at), "dd/MM/yyyy HH:mm")
                  }}</span>
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  :loading="isDeletingCommentId === comment.id"
                  @click="deleteComment(comment.id)"
                />
              </div>
            </div>
            <p class="text-sm text-toned">{{ comment.content }}</p>
          </div>
        </div>
        <div v-else class="text-center py-8 text-dimmed italic">
          Aucun commentaire pour le moment.
        </div>

        <div class="mt-4 pt-4 border-t border-default">
          <h4 class="font-medium text-highlighted mb-2">Commenter en tant que mairie</h4>
          <p class="text-xs text-muted mb-2">
            Votre commentaire sera affiché sous le nom « Mairie {{ currentCommune?.name ?? '…' }} ».
          </p>
            <UTextarea v-model="newComment" placeholder="Saisissez votre commentaire..." :rows="3"
              :disabled="isSubmittingComment" class="w-full" />
            <UButton label="Publier le commentaire" icon="i-lucide-send" :loading="isSubmittingComment"
              :disabled="!newComment?.trim()" color="primary" @click="submitMairieComment" class="float-right mt-4" />
          </div>
      </div>
    </div>
  </UDashboardPanel>

  <UModal v-model:open="isImageModalOpen">
    <template #body>
      <div class="flex flex-col items-center justify-center p-2 gap-4">
        <img
          v-if="proposition.photo_url"
          :src="proposition.photo_url"
          :alt="`Photo de la proposition ${proposition.id}`"
          class="max-w-full max-h-[75vh] object-contain rounded-lg shadow-xl"
        >
      </div>
    </template>
  </UModal>
</template>
