<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Commune } from "~/types";

const props = defineProps<{
  commune: Commune | null;
}>();

const schema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  postal_code: z.string().min(1, "Le code postal est requis"),
  email: z.string().email("Email invalide"),
  logo_url: z.string().url("URL invalide").optional().or(z.literal("")),
  feature_reservations_salles: z.boolean(),
  feature_propositions: z.boolean(),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  name: undefined,
  postal_code: undefined,
  email: undefined,
  logo_url: undefined,
  feature_reservations_salles: true,
  feature_propositions: true,
});

const toast = useToast();
const refresh = inject<() => void>("refresh-communes");
const { getAuthHeaders } = useApiAuth();
const { isAdministrator } = useCurrentUser();

watch(
  () => props.commune,
  (newCommune) => {
    if (newCommune) {
      state.name = newCommune.name;
      state.postal_code = newCommune.postal_code;
      state.email = newCommune.email;
      state.logo_url = newCommune.logo_url || "";
      state.feature_reservations_salles =
        newCommune.feature_reservations_salles !== false;
      state.feature_propositions =
        newCommune.feature_propositions !== false;
    }
  },
  { immediate: true },
);

const emit = defineEmits<{
  delete: [commune: Commune];
  update: [commune: Commune];
}>();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.commune) return;

  try {
    const updatedCommune = await $fetch<Commune>(`/api/communes/${props.commune.id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: {
        name: event.data.name,
        postal_code: event.data.postal_code,
        email: event.data.email,
        logo_url: event.data.logo_url || null,
        feature_reservations_salles: event.data.feature_reservations_salles,
        feature_propositions: event.data.feature_propositions,
      },
    });

    emit("update", updatedCommune);

    toast.add({
      title: "Succès",
      description: `La commune "${event.data.name}" a été modifiée`,
      color: "success",
    });

    open.value = false;

    if (refresh) {
      refresh();
    }
  } catch (error: any) {
    toast.add({
      title: "Erreur",
      description:
        error.data?.message ||
        error.message ||
        "Une erreur est survenue lors de la modification",
      color: "error",
    });
  }
}

async function handleDelete() {
  if (!props.commune) return;

  open.value = false;
  emit("delete", props.commune);
}

function openModal() {
  if (props.commune) {
    state.name = props.commune.name;
    state.postal_code = props.commune.postal_code;
    state.email = props.commune.email;
    state.logo_url = props.commune.logo_url || "";
    state.feature_reservations_salles =
      props.commune.feature_reservations_salles !== false;
    state.feature_propositions =
      props.commune.feature_propositions !== false;
    open.value = true;
  }
}

defineExpose({
  openModal,
});
</script>

<template>
  <UModal
    v-model:open="open"
    title="Modifier la commune"
    description="Modifier les informations d'une commune"
  >
    <template #body>
      <div v-if="commune" class="mb-4 p-3 bg-elevated rounded-lg space-y-2">
        <div>
          <p class="text-sm text-muted">Date de création :</p>
          <p class="font-medium">
            {{
              commune.created_at
                ? new Date(commune.created_at).toLocaleString("fr-FR")
                : "-"
            }}
          </p>
        </div>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nom" placeholder="Venerque" name="name" required>
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField
          label="Code postal"
          placeholder="31810"
          name="postal_code"
          required
        >
          <UInput v-model="state.postal_code" class="w-full" />
        </UFormField>

        <UFormField
          label="Email"
          placeholder="contact@commune.fr"
          name="email"
          required
        >
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>

        <UFormField
          label="Logo URL"
          placeholder="https://example.com/logo.png"
          name="logo_url"
        >
          <UInput v-model="state.logo_url" class="w-full" />
        </UFormField>

        <div class="space-y-3 rounded-lg border border-default p-4">
          <p class="text-sm font-medium text-highlighted">
            Application mobile
          </p>
          <UFormField
            label="Réservation de salles"
            name="feature_reservations_salles"
          >
            <USwitch v-model="state.feature_reservations_salles" />
          </UFormField>
          <UFormField
            label="Propositions"
            name="feature_propositions"
          >
            <USwitch v-model="state.feature_propositions" />
          </UFormField>
        </div>

        <div
          v-if="state.logo_url"
          class="flex justify-center p-4 bg-muted/50 rounded-lg border border-dashed border-default"
        >
          <img
            :src="state.logo_url"
            class="max-h-32 object-contain rounded"
            alt="Aperçu du logo"
            @error="
              (e) => ((e.target as HTMLImageElement).style.display = 'none')
            "
            @load="
              (e) => ((e.target as HTMLImageElement).style.display = 'block')
            "
          />
        </div>

        <div class="flex justify-between gap-2 pt-2">
          <UButton
            v-if="isAdministrator"
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
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
