<script setup lang="ts">
const props = defineProps<{
  email: string
  onConfirm?: () => void
}>()

const emit = defineEmits<{ close: [boolean], confirm: [boolean] }>()

const confirm = () => {
  if (props.onConfirm) {
    props.onConfirm()
  } else {
    emit('close', false)
  }
}
</script>

<template>
  <UModal :close="{ onClick: () => emit('close', false) }">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900">
          <UIcon name="i-lucide-mail" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Vérification de votre email
          </h3>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Votre compte a été créé avec succès !
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Un email de confirmation vous a été envoyé à l'adresse <strong class="text-gray-900 dark:text-white">{{ email
            }}</strong>.
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Veuillez cliquer sur le lien dans cet email pour valider votre compte avant de pouvoir vous connecter.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton color="primary" @click="confirm">
          Compris
        </UButton>
      </div>
    </template>
  </UModal>
</template>
