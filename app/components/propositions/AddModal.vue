<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent, EditorToolbarItem } from "@nuxt/ui";
import type { Proposition } from "~/types";

const editorToolbarItems: EditorToolbarItem[] = [
  {
    icon: "i-lucide-heading",
    tooltip: { text: "Titres" },
    content: { align: "start" },
    items: [
      { kind: "heading", level: 1, icon: "i-lucide-heading-1", label: "Titre 1" },
      { kind: "heading", level: 2, icon: "i-lucide-heading-2", label: "Titre 2" },
      { kind: "heading", level: 3, icon: "i-lucide-heading-3", label: "Titre 3" },
    ],
  },
  { kind: "mark", mark: "bold", icon: "i-lucide-bold", tooltip: { text: "Gras" } },
  { kind: "mark", mark: "italic", icon: "i-lucide-italic", tooltip: { text: "Italique" } },
  { kind: "mark", mark: "strike", icon: "i-lucide-strikethrough", tooltip: { text: "Barré" } },
  { kind: "bulletList", icon: "i-lucide-list", tooltip: { text: "Liste à puces" } },
  { kind: "orderedList", icon: "i-lucide-list-ordered", tooltip: { text: "Liste numérotée" } },
  { kind: "link", icon: "i-lucide-link", tooltip: { text: "Lien" } },
  { kind: "image", icon: "i-lucide-image", tooltip: { text: "Image" } },
];

const schema = z.object({
  name: z.string().min(3, "Le titre est requis"),
  description: z.string().min(10, "La description est requise"),
  photo_url: z.union([z.string().url("URL invalide"), z.literal(""), z.undefined()]).optional(),
  comments_public: z.boolean().default(true),
});

type Schema = z.output<typeof schema>;

const open = ref(false);
const state = reactive<Partial<Schema>>({
  name: undefined,
  description: "",
  photo_url: undefined,
  comments_public: true,
});

const toast = useToast();
const refresh = inject<() => void>("refresh-propositions");
const { getAuthHeaders } = useApiAuth();
const { currentCommune } = useCurrentCommune();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const communeId = currentCommune.value?.id;
  if (!communeId) return;
  try {
    await $fetch<Proposition>("/api/propositions", {
      method: "POST",
      headers: getAuthHeaders(),
      body: {
        commune_id: communeId,
        name: event.data.name.trim(),
        description: event.data.description.trim(),
        photo_url: event.data.photo_url || null,
        comments_public: event.data.comments_public,
      },
    });
    toast.add({
      title: "Succès",
      description: "La proposition a été créée",
      color: "success",
    });
    open.value = false;
    state.name = undefined;
    state.description = "";
    state.photo_url = undefined;
    state.comments_public = true;
    refresh?.();
  } catch (error: any) {
    toast.add({
      title: "Erreur",
      description: error?.message || "Création impossible",
      color: "error",
    });
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Nouvelle proposition"
    description="Créer une proposition au nom de la commune"
  >
    <UButton label="Nouvelle proposition" icon="i-lucide-plus" />

    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
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

        <UFormField label="Photo (optionnel)" name="photo_url">
          <GalleryImagePicker v-model="state.photo_url" />
        </UFormField>

        <UFormField label="Visibilité des commentaires" name="comments_public">
          <UCheckbox v-model="state.comments_public" label="Rendre les commentaires utilisateurs publics" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton label="Annuler" color="neutral" variant="subtle" @click="open = false" />
          <UButton label="Créer" color="primary" type="submit" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
