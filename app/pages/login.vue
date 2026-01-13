<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: []
})

const router = useRouter()
const toast = useToast()
const { signIn, getSession } = useSupabase()

const form = ref({
  email: '',
  password: ''
})

const loading = ref(false)
const showPassword = ref(false)
const errors = ref<Record<string, string>>({})

const validateForm = () => {
  errors.value = {}

  if (!form.value.email.trim()) {
    errors.value.email = 'L\'email est requis'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'L\'email n\'est pas valide'
  }

  if (!form.value.password) {
    errors.value.password = 'Le mot de passe est requis'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) {
    toast.add({
      title: 'Erreur de validation',
      description: 'Veuillez corriger les erreurs dans le formulaire',
      color: 'error'
    })
    return
  }

  loading.value = true

  try {
    await signIn(form.value.email, form.value.password)

    toast.add({
      title: 'Connexion réussie',
      description: 'Vous êtes maintenant connecté',
      color: 'success'
    })

    // Rediriger vers la page d'accueil
    router.push('/')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Email ou mot de passe incorrect'
    toast.add({
      title: 'Erreur de connexion',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Vérifier si l'utilisateur est déjà connecté
onMounted(async () => {
  const session = await getSession()
  if (session) {
    router.push('/')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <img src="/logo.png" alt="Logo" class="mx-auto h-20 w-auto">
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
          Connexion
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Connectez-vous à votre compte
        </p>
      </div>

      <UCard>
        <form class="space-y-6 flex flex-col items-center" @submit.prevent="handleSubmit">
          <UFormField label="Email" name="email" class="w-[70%]">
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

          <UFormField label="Mot de passe" name="password" class="w-[70%]">
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
          </UFormField>

          <div class="flex items-center justify-between pt-4">
            <UButton to="/signup" variant="ghost" :disabled="loading">
              Créer un compte
            </UButton>

            <UButton type="submit" :loading="loading" icon="i-lucide-log-in">
              Se connecter
            </UButton>
          </div>
        </form>
      </UCard>
    </div>
  </div>
</template>
