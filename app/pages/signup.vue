<script setup lang="ts">

import VerificationEmailModal from '~/components/signup/VerificationEmailModal.vue'

definePageMeta({
  layout: false,
  middleware: []
})

const router = useRouter()
const toast = useToast()

const form = ref({
  firstName: '',
  lastName: '',
  fonction: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const errors = ref<Record<string, string>>({})

// const emit = defineEmits<{ close: [boolean] }>()






const overlay = useOverlay()
const confirmEmailModal = overlay.create(VerificationEmailModal)


confirmEmailModal.open({
  email: form.value.email,
  onConfirm: () => {
    closeModalAndRedirect()
  }
})


const closeModalAndRedirect = () => {
  confirmEmailModal.close()
  router.push('/login')
}

const validateForm = () => {
  errors.value = {}

  if (!form.value.firstName.trim()) {
    errors.value.firstName = 'Le prénom est requis'
  }

  if (!form.value.lastName.trim()) {
    errors.value.lastName = 'Le nom est requis'
  }

  if (!form.value.fonction.trim()) {
    errors.value.fonction = 'La fonction est requise'
  }

  if (!form.value.email.trim()) {
    errors.value.email = 'L\'email est requis'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'L\'email n\'est pas valide'
  }

  if (!form.value.password) {
    errors.value.password = 'Le mot de passe est requis'
  } else if (form.value.password.length < 6) {
    errors.value.password = 'Le mot de passe doit contenir au moins 6 caractères'
  }

  if (form.value.password !== form.value.confirmPassword) {
    errors.value.confirmPassword = 'Les mots de passe ne correspondent pas'
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
    await $fetch('/api/auth/signup', {
      method: 'POST',
      body: {
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        fonction: form.value.fonction,
        email: form.value.email,
        password: form.value.password
      }
    })

    // Afficher la modale d'information
    confirmEmailModal.open({
      email: form.value.email,
      onConfirm: () => {
        router.push('/login')
      }
    })
  } catch (error: unknown) {
    let errorMessage = 'Une erreur est survenue'
    if (error && typeof error === 'object' && 'data' in error) {
      const errorData = error.data as { message?: string }
      errorMessage = errorData?.message || 'Une erreur est survenue'
    } else if (error instanceof Error) {
      errorMessage = error.message
    }
    toast.add({
      title: 'Erreur lors de la création du compte',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <img src="/logo.png" alt="Logo" class="mx-auto h-20 w-auto">
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
          Création de compte
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Créez votre compte
        </p>
      </div>

      <UCard>
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Prénom" name="firstName">
              <UInput v-model="form.firstName" placeholder="Prénom" :disabled="loading" :error="!!errors.firstName" />
              <p v-if="errors.firstName" class="text-sm text-error mt-1">
                {{ errors.firstName }}
              </p>
            </UFormField>

            <UFormField label="Nom" name="lastName">
              <UInput v-model="form.lastName" placeholder="Nom" :disabled="loading" :error="!!errors.lastName" />
              <p v-if="errors.lastName" class="text-sm text-error mt-1">
                {{ errors.lastName }}
              </p>
            </UFormField>
          </div>

          <UFormField label="Fonction" name="fonction">
            <UInput v-model="form.fonction" placeholder="Ex: Maire, Secrétaire, etc." :disabled="loading"
              :error="!!errors.fonction" />
            <p v-if="errors.fonction" class="text-sm text-error mt-1">
              {{ errors.fonction }}
            </p>
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput v-model="form.email" type="email" placeholder="votre.email@exemple.com" :disabled="loading"
              :error="!!errors.email" />
            <p v-if="errors.email" class="text-sm text-error mt-1">
              {{ errors.email }}
            </p>
          </UFormField>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Mot de passe" name="password">
              <UInput v-model="form.password" type="password" placeholder="••••••••" :disabled="loading"
                :error="!!errors.password" />
              <p v-if="errors.password" class="text-sm text-error mt-1">
                {{ errors.password }}
              </p>
            </UFormField>

            <UFormField label="Confirmer le mot de passe" name="confirmPassword">
              <UInput v-model="form.confirmPassword" type="password" placeholder="••••••••" :disabled="loading"
                :error="!!errors.confirmPassword" />
              <p v-if="errors.confirmPassword" class="text-sm text-error mt-1">
                {{ errors.confirmPassword }}
              </p>
            </UFormField>
          </div>

          <div class="flex items-center justify-between pt-4">
            <UButton to="/login" variant="ghost" :disabled="loading">
              Déjà un compte ? Se connecter
            </UButton>

            <UButton type="submit" :loading="loading" icon="i-lucide-user-plus">
              Créer le compte
            </UButton>
          </div>
        </form>
      </UCard>
    </div>
  </div>
</template>
