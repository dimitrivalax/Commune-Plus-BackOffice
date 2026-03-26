<script setup lang="ts">
import { format } from "date-fns";
import type { Signalement } from "~/types";

const props = defineProps<{
  signalement: Signalement;
}>();

const emits = defineEmits<{
  close: [];
  update: [signalement: Signalement];
}>();

const toast = useToast();
const { session } = useSupabase();

const localStatus = ref<Signalement["status"]>(props.signalement.status);
const localReponse = ref<string | null>(props.signalement.reponse);
const isSaving = ref(false);
const isImageModalOpen = ref(false);

const authHeaders = computed(() => {
  const currentSession = session.value;
  if (!currentSession?.access_token) {
    return {};
  }
  return {
    Authorization: `Bearer ${currentSession.access_token}`,
  };
});

watch(
  () => props.signalement,
  (newSignalement) => {
    localStatus.value = newSignalement.status;
    localReponse.value = newSignalement.reponse;
  },
  { immediate: true },
);

const getStatusColor = (status: string) => {
  switch (status) {
    case "en_attente":
      return "warning";
    case "en_cours":
      return "info";
    case "traite":
      return "success";
    case "archive":
      return "neutral";
    default:
      return "neutral";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "en_attente":
      return "En Attente";
    case "en_cours":
      return "En cours";
    case "traite":
      return "Traité";
    case "archive":
      return "Archivé";
    default:
      return status;
  }
};

const statusOptions = computed(() => [
  { label: "En Attente", value: "en_attente" },
  { label: "En cours", value: "en_cours" },
  { label: "Traité", value: "traite" },
  { label: "Archivé", value: "archive" },
]);

const hasChanges = computed(() => {
  return (
    localStatus.value !== props.signalement.status ||
    localReponse.value !== props.signalement.reponse
  );
});

const updateSignalement = async () => {
  // Ne rien faire si rien n'a changé
  if (!hasChanges.value) {
    return;
  }

  isSaving.value = true;
  try {
    const updateBody: {
      status?: Signalement["status"];
      reponse?: string | null;
    } = {};

    if (localStatus.value !== props.signalement.status) {
      updateBody.status = localStatus.value;
    }

    if (localReponse.value !== props.signalement.reponse) {
      updateBody.reponse = localReponse.value || null;
    }

    const updated = await $fetch<Signalement>(
      `/api/signalements/${props.signalement.id}`,
      {
        method: "PUT",
        body: updateBody,
        headers: authHeaders.value,
      },
    );

    // Émettre l'événement pour mettre à jour le signalement dans le parent
    emits("update", updated);

    toast.add({
      title: "Modifications enregistrées",
      description: "Le signalement a été mis à jour avec succès",
      icon: "i-lucide-check-circle",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Erreur",
      description:
        error.message || "Impossible de mettre à jour le signalement",
      icon: "i-lucide-alert-circle",
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
};

const updateStatus = async (newStatus: Signalement["status"]) => {
  localStatus.value = newStatus;
  await updateSignalement();
};

const dropdownItems = computed(() => [
  [
    {
      label: "Marquer comme En Attente",
      icon: "i-lucide-clock",
      onSelect: () => updateStatus("en_attente"),
    },
    {
      label: "Marquer comme En cours",
      icon: "i-lucide-play-circle",
      onSelect: () => updateStatus("en_cours"),
    },
    {
      label: "Marquer comme Traité",
      icon: "i-lucide-check-circle",
      onSelect: () => updateStatus("traite"),
    },
    {
      label: "Marquer comme Archivé",
      icon: "i-lucide-archive",
      onSelect: () => updateStatus("archive"),
    },
  ],
]);

const { displayAddress, showLocalisation, isResolvingAddress } =
  useSignalementAddress(toRef(props, "signalement"));
</script>

<template>
  <UDashboardPanel
    id="signalement-2"
    :ui="{
      root: 'relative flex flex-col min-w-0 h-full !min-h-0 overflow-hidden shrink',
      body: 'flex flex-col gap-4 sm:gap-6 flex-1 min-h-0 overflow-hidden p-0',
    }"
  >
    <UDashboardNavbar title="Détail du signalement" :toggle="false">
      <template #leading>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          class="-ms-1.5"
          @click="emits('close')"
        />
      </template>

      <template #right>
        <UDropdownMenu :items="dropdownItems">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
      </template>
    </UDashboardNavbar>

    <div
      class="flex flex-col sm:flex-row justify-between gap-1 p-4 sm:px-6 border-b border-default"
    >
      <div class="flex items-start gap-4 sm:my-1.5">
        <UAvatar
          :alt="`${signalement.first_name} ${signalement.last_name}`"
          size="3xl"
        >
          {{ signalement.first_name[0] }}{{ signalement.last_name[0] }}
        </UAvatar>

        <div class="min-w-0">
          <p class="font-semibold text-highlighted">
            {{ signalement.first_name }} {{ signalement.last_name }}
          </p>
          <p v-if="signalement.email" class="text-muted">
            {{ signalement.email }}
          </p>
          <p v-if="signalement.phone" class="text-muted">
            {{ signalement.phone }}
          </p>
        </div>
      </div>

      <div class="max-sm:pl-16 sm:mt-2 flex flex-col items-end gap-2">
        <UBadge
          :label="getStatusLabel(signalement.status)"
          :color="getStatusColor(signalement.status)"
        />
        <p class="text-muted text-sm">
          {{ format(new Date(signalement.created_at), "dd MMM yyyy HH:mm") }}
        </p>
      </div>
    </div>

    <div class="min-h-0 flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
      <div v-if="signalement.description">
        <h3 class="font-semibold text-highlighted mb-2">Description</h3>
        <p class="whitespace-pre-wrap">
          {{ signalement.description }}
        </p>
      </div>

      <div v-if="signalement.reponse">
        <h3 class="font-semibold text-highlighted mb-2">Réponse</h3>
        <p class="whitespace-pre-wrap">
          {{ signalement.reponse }}
        </p>
      </div>

      <div v-if="showLocalisation">
        <h3 class="font-semibold text-highlighted mb-2">Localisation</h3>
        <p class="mb-2">
          <span v-if="isResolvingAddress" class="text-muted">
            Résolution de l'adresse…
          </span>
          <template v-else> 📍 {{ displayAddress }} </template>
        </p>
        <p
          v-if="
            signalement.address?.trim() &&
            signalement.latitude != null &&
            signalement.longitude != null
          "
          class="text-muted text-sm"
        >
          Coordonnées : {{ signalement.latitude.toFixed(6) }},
          {{ signalement.longitude.toFixed(6) }}
        </p>
        <div
          v-if="signalement.latitude != null && signalement.longitude != null"
          class="mt-2"
        >
          <a
            :href="`https://www.openstreetmap.org/?mlat=${signalement.latitude}&mlon=${signalement.longitude}#map=17/${signalement.latitude}/${signalement.longitude}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline"
          >
            Voir sur OpenStreetMap
          </a>
        </div>
      </div>

      <div v-if="signalement.photo_url">
        <h3 class="font-semibold text-highlighted mb-2">Photo</h3>
        <img
          :src="signalement.photo_url"
          :alt="`Photo du signalement ${signalement.id}`"
          class="h-48 w-48 object-cover rounded-lg border border-default cursor-pointer hover:opacity-90 transition-opacity"
          @click="isImageModalOpen = true"
        />
        <p
          v-if="signalement.comment"
          class="mt-3 text-muted italic whitespace-pre-wrap"
        >
          {{ signalement.comment }}
        </p>
      </div>
      <!-- Section de gestion du signalement -->
      <div class="bg-default/50 rounded-lg p-4 space-y-4 border border-default">
        <h3 class="font-semibold text-highlighted mb-3">
          Gestion du signalement
        </h3>

        <!-- Sélecteur de statut -->
        <UFormField label="Statut" name="status">
          <div class="flex items-center gap-3">
            <USelect
              v-model="localStatus"
              :items="statusOptions"
              placeholder="Sélectionner un statut"
              :disabled="isSaving"
              class="flex-1"
            />
            <UBadge
              :label="getStatusLabel(localStatus)"
              :color="getStatusColor(localStatus)"
            />
          </div>
        </UFormField>

        <!-- Zone de réponse -->
        <UFormField label="Réponse au signalement" name="reponse">
          <UTextarea
            v-model="localReponse"
            placeholder="Saisissez votre réponse au signalement..."
            :rows="4"
            :disabled="isSaving"
            class="w-full"
          />
          <template #description>
            Cette réponse sera visible par le citoyen qui a effectué le
            signalement.
          </template>
        </UFormField>

        <!-- Bouton de sauvegarde -->
        <div class="flex justify-end pt-2">
          <UButton
            label="Envoyer"
            icon="i-lucide-send"
            :disabled="!hasChanges || isSaving"
            :loading="isSaving"
            color="primary"
            @click="updateSignalement"
          />
        </div>
      </div>
    </div>
  </UDashboardPanel>

  <UModal v-model:open="isImageModalOpen">
    <template #body>
      <div class="flex flex-col items-center justify-center p-2 gap-4">
        <img
          v-if="signalement.photo_url"
          :src="signalement.photo_url"
          :alt="`Photo du signalement ${signalement.id}`"
          class="max-w-full max-h-[75vh] object-contain rounded-lg shadow-xl"
        >
        <p v-if="signalement.comment" class="text-center text-muted italic whitespace-pre-wrap max-w-2xl">
          {{ signalement.comment }}
        </p>
      </div>
    </template>
  </UModal>
</template>
```
