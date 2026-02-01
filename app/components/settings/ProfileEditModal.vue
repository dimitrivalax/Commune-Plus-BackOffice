<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const { user: supabaseUser, supabase } = useSupabase();
const toast = useToast();

const isOpen = ref(false);
const loading = ref(false);
const fileRef = ref<HTMLInputElement>();

const profileSchema = z.object({
  first_name: z.string().min(2, "Trop court"),
  last_name: z.string().min(2, "Trop court"),
  avatar_url: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileSchema = z.output<typeof profileSchema>;

const state = reactive<Partial<ProfileSchema>>({
  first_name: "",
  last_name: "",
  avatar_url: "",
  bio: "",
});

watch(
  () => supabaseUser.value,
  (user) => {
    if (user) {
      const metadata = user.user_metadata || {};
      state.first_name = metadata.first_name || "";
      state.last_name = metadata.last_name || "";
      state.avatar_url = metadata.avatar_url || "";
      state.bio = metadata.bio || "";
    }
  },
  { immediate: true },
);

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  if (!supabase) return;

  loading.value = true;
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: event.data.first_name,
        last_name: event.data.last_name,
        avatar_url: event.data.avatar_url,
        bio: event.data.bio,
      },
    });

    if (error) throw error;

    toast.add({
      title: "Succès",
      description: "Votre profil a été mis à jour.",
      icon: "i-lucide-check",
      color: "success",
    });
    isOpen.value = false;
  } catch (error: any) {
    toast.add({
      title: "Erreur",
      description:
        error.message || "Une erreur est survenue lors de la mise à jour.",
      icon: "i-lucide-x",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;

  // Note: Here we would normally upload the file to Supabase Storage
  // For now, let's just use object URL as in the original settings page
  state.avatar_url = URL.createObjectURL(input.files[0]!);
}

function onFileClick() {
  fileRef.value?.click();
}

function openModal() {
  console.log("Opening ProfileEditModal");
  isOpen.value = true;
}

defineExpose({
  openModal,
});
</script>

<template>
  <UModal v-model:open="isOpen" title="Modifier le profil">
    <template #body>
      <UForm
        :schema="profileSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Prénom" name="first_name">
            <UInput v-model="state.first_name" placeholder="Prénom" />
          </UFormField>
          <UFormField label="Nom" name="last_name">
            <UInput v-model="state.last_name" placeholder="Nom" />
          </UFormField>
        </div>

        <UFormField
          label="Avatar"
          name="avatar_url"
          description="Cliquez pour changer d'avatar"
        >
          <div class="flex items-center gap-4">
            <UAvatar
              :src="state.avatar_url"
              :alt="state.first_name"
              size="lg"
            />
            <UButton
              label="Choisir"
              color="neutral"
              variant="outline"
              @click="onFileClick"
            />
            <input
              ref="fileRef"
              type="file"
              class="hidden"
              accept=".jpg, .jpeg, .png, .gif"
              @change="onFileChange"
            />
          </div>
        </UFormField>

        <UFormField label="Biographie" name="bio">
          <UTextarea
            v-model="state.bio"
            placeholder="Parlez-nous de vous..."
            :rows="3"
            autoresize
          />
        </UFormField>

        <div class="flex justify-end gap-3 mt-6">
          <UButton
            label="Annuler"
            color="neutral"
            variant="ghost"
            @click="isOpen = false"
          />
          <UButton type="submit" label="Enregistrer" :loading="loading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
