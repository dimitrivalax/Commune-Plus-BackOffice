<script setup lang="ts">
import type { Proposition } from "~/types";

const props = defineProps<{
  proposition: Proposition | null;
}>();

const open = ref(false);
const toast = useToast();
const refresh = inject<() => void>("refresh-propositions");
const { getAuthHeaders } = useApiAuth();

const description = computed(() => {
  if (!props.proposition)
    return "Êtes-vous sûr de vouloir supprimer cette proposition ? Cette action ne peut pas être annulée.";
  return `Êtes-vous sûr de vouloir supprimer "${props.proposition.name}" ? Cette action ne peut pas être annulée.`;
});

async function onSubmit() {
  if (!props.proposition) return;
  try {
    await $fetch(`/api/propositions/${props.proposition.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    toast.add({
      title: "Succès",
      description: "La proposition a été supprimée",
      color: "success",
    });
    open.value = false;
    refresh?.();
  } catch (error: any) {
    toast.add({
      title: "Erreur",
      description: error?.message || "Suppression impossible",
      color: "error",
    });
  }
}

function openModal() {
  open.value = true;
}

defineExpose({ openModal });
</script>

<template>
  <UModal v-model:open="open" title="Supprimer la proposition" :description="description">
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton label="Annuler" color="neutral" variant="subtle" @click="open = false" />
        <UButton label="Supprimer" color="error" variant="solid" loading-auto @click="onSubmit" />
      </div>
    </template>
  </UModal>
</template>
