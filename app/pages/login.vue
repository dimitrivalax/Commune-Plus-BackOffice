<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: [],
});

const router = useRouter();
const toast = useToast();
const route = useRoute();
const { signIn, getSession, resetPassword, updatePassword } = useSupabase();

const form = ref({
  email: "",
  password: "",
  newPassword: "",
});

const loading = ref(false);
const showPassword = ref(false);
const showNewPassword = ref(false);
const isResetMode = ref(false);
const isRecoveryMode = ref(false);
const errors = ref<Record<string, string>>({});

onMounted(async () => {
  if (route.query.type === "recovery") {
    isRecoveryMode.value = true;
  }

  const session = await getSession();
  if (session && !isRecoveryMode.value) {
    router.push("/");
  }
});

const validateForm = () => {
  errors.value = {};

  if (isRecoveryMode.value) {
    if (!form.value.newPassword) {
      errors.value.newPassword = "Le nouveau mot de passe est requis";
    } else if (form.value.newPassword.length < 6) {
      errors.value.newPassword =
        "Le mot de passe doit faire au moins 6 caractères";
    }
  } else {
    if (!form.value.email.trim()) {
      errors.value.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
      errors.value.email = "L'email n'est pas valide";
    }

    if (!isResetMode.value && !form.value.password) {
      errors.value.password = "Le mot de passe est requis";
    }
  }

  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    toast.add({
      title: "Erreur de validation",
      description: "Veuillez corriger les erreurs dans le formulaire",
      color: "error",
    });
    return;
  }

  loading.value = true;

  try {
    if (isRecoveryMode.value) {
      await updatePassword(form.value.newPassword);
      toast.add({
        title: "Succès",
        description: "Votre mot de passe a été mis à jour",
        color: "success",
      });
      isRecoveryMode.value = false;
      router.replace("/login");
    } else if (isResetMode.value) {
      await resetPassword(form.value.email);
      toast.add({
        title: "Email envoyé",
        description:
          "Veuillez vérifier votre boîte mail pour réinitialiser votre mot de passe",
        color: "success",
      });
      isResetMode.value = false;
    } else {
      await signIn(form.value.email, form.value.password);
      toast.add({
        title: "Connexion réussie",
        description: "Vous êtes maintenant connecté",
        color: "success",
      });
      router.push("/");
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Une erreur est survenue";
    toast.add({
      title: "Erreur",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"
  >
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <img src="/logo.png" alt="Logo" class="mx-auto h-20 w-auto" />
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
          {{
            isRecoveryMode
              ? "Nouveau mot de passe"
              : isResetMode
                ? "Réinitialisation"
                : "Connexion"
          }}
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{
            isRecoveryMode
              ? "Définissez votre nouveau mot de passe"
              : isResetMode
                ? "Entrez votre email pour recevoir un lien"
                : "Connectez-vous à votre compte"
          }}
        </p>
      </div>

      <UCard>
        <form
          class="space-y-6 flex flex-col items-center"
          @submit.prevent="handleSubmit"
        >
          <UFormField
            v-if="!isRecoveryMode"
            label="Email"
            name="email"
            class="w-[70%]"
          >
            <UInput
              v-model="form.email"
              type="email"
              placeholder="votre.email@exemple.com"
              :disabled="loading"
              autocomplete="email"
              :error="!!errors.email"
              class="w-full"
            />
            <p v-if="errors.email" class="text-sm text-error mt-1">
              {{ errors.email }}
            </p>
          </UFormField>

          <UFormField
            v-if="!isResetMode && !isRecoveryMode"
            label="Mot de passe"
            name="password"
            class="w-[70%]"
          >
            <UInput
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              :disabled="loading"
              autocomplete="current-password"
              :error="!!errors.password"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  :padded="false"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
            <p v-if="errors.password" class="text-sm text-error mt-1">
              {{ errors.password }}
            </p>
            <div class="flex justify-end mt-1">
              <UButton
                variant="link"
                :padded="false"
                size="xs"
                @click="isResetMode = true"
              >
                Mot de passe oublié ?
              </UButton>
            </div>
          </UFormField>

          <UFormField
            v-if="isRecoveryMode"
            label="Nouveau mot de passe"
            name="newPassword"
            class="w-[70%]"
          >
            <UInput
              v-model="form.newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              placeholder="••••••••"
              :disabled="loading"
              autocomplete="new-password"
              :error="!!errors.newPassword"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  :icon="showNewPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  :padded="false"
                  @click="showNewPassword = !showNewPassword"
                />
              </template>
            </UInput>
            <p v-if="errors.newPassword" class="text-sm text-error mt-1">
              {{ errors.newPassword }}
            </p>
          </UFormField>

          <div class="flex items-center justify-between w-[70%] pt-4">
            <UButton
              v-if="isResetMode || isRecoveryMode"
              variant="ghost"
              @click="
                isResetMode = false;
                isRecoveryMode = false;
              "
            >
              Retour
            </UButton>
            <div v-else />

            <UButton
              type="submit"
              :loading="loading"
              :icon="isResetMode ? 'i-lucide-mail' : 'i-lucide-log-in'"
            >
              {{
                isRecoveryMode
                  ? "Valider"
                  : isResetMode
                    ? "Envoyer"
                    : "Se connecter"
              }}
            </UButton>
          </div>
        </form>
      </UCard>
    </div>
  </div>
</template>
