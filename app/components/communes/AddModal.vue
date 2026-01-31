<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const schema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  postal_code: z.string().min(1, "Le code postal est requis"),
  email: z.string().email("Email invalide"),
  logo_url: z.string().url("URL invalide").optional().or(z.literal("")),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  name: undefined,
  postal_code: undefined,
  email: undefined,
  logo_url: undefined,
});

const toast = useToast();
const refresh = inject<() => void>("refresh-communes");
const { getAuthHeaders } = useApiAuth();

function resetForm() {
  state.name = undefined;
  state.postal_code = undefined;
  state.email = undefined;
  state.logo_url = undefined;
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await $fetch("/api/communes/create", {
      method: "POST",
      headers: getAuthHeaders(),
      body: {
        name: event.data.name,
        postal_code: event.data.postal_code,
        email: event.data.email,
        logo_url: event.data.logo_url || null,
      },
    });

    toast.add({
      title: "Succès",
      description: `La commune "${event.data.name}" a été créée`,
      color: "success",
    });

    open.value = false;
    resetForm();

    if (refresh) {
      refresh();
    }
  } catch (error: any) {
    toast.add({
      title: "Erreur",
      description:
        error.data?.message ||
        error.message ||
        "Une erreur est survenue lors de la création",
      color: "error",
    });
  }
}

function openModal() {
  resetForm();
  open.value = true;
}

defineExpose({
  openModal,
});
</script>

<template>
  <UModal
    v-model:open="open"
    title="Ajouter une commune"
    description="Créer une nouvelle commune"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nom" placeholder="Paris" name="name" required>
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField
          label="Code postal"
          placeholder="75001"
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

        <div class="flex justify-end gap-2 pt-2">
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
