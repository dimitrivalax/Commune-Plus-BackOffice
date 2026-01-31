<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Commune } from '~/types'

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  role: z.enum(['utilisateur', 'administrateur'])
})

const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  nom: undefined,
  prenom: undefined,
  email: undefined,
  password: undefined,
  role: 'utilisateur' as 'utilisateur' | 'administrateur'
})

const toast = useToast()
const refresh = inject<() => void>('refresh-utilisateurs')
const { getAuthHeaders } = useApiAuth()

const { data: communes } = await useFetch<Commune[]>('/api/communes', {
  lazy: true,
  headers: getAuthHeaders()
})

const selectedCommunes = ref<string[]>([])

function resetForm() {
  state.nom = undefined
  state.prenom = undefined
  state.email = undefined
  state.password = undefined
  state.role = 'utilisateur'
  selectedCommunes.value = []
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await $fetch('/api/utilisateurs/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        nom: event.data.nom,
        prenom: event.data.prenom,
        email: event.data.email,
        password: event.data.password,
        role: event.data.role || 'utilisateur',
        communes: selectedCommunes.value
      }
    })

    toast.add({
      title: 'Succès',
      description: `L'utilisateur "${event.data.prenom} ${event.data.nom}" a été créé`,
      color: 'success'
    })

    open.value = false
    resetForm()

    if (refresh) {
      refresh()
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || error.message || 'Une erreur est survenue lors de la création',
      color: 'error'
    })
  }
}

function openModal() {
  resetForm()
  open.value = true
}

defineExpose({
  openModal
})
</script>

<template>
  <UModal v-model:open="open" title="Ajouter un utilisateur" description="Créer un nouvel utilisateur">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Nom"
          placeholder="Dupont"
          name="nom"
          required
        >
          <UInput v-model="state.nom" class="w-full" />
        </UFormField>

        <UFormField
          label="Prénom"
          placeholder="Jean"
          name="prenom"
          required
        >
          <UInput v-model="state.prenom" class="w-full" />
        </UFormField>

        <UFormField
          label="Email"
          placeholder="jean.dupont@exemple.com"
          name="email"
          required
        >
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>

        <UFormField
          label="Mot de passe"
          placeholder="••••••••"
          name="password"
          required
        >
          <UInput v-model="state.password" type="password" class="w-full" autocomplete="new-password" />
        </UFormField>

        <UFormField label="Rôle" name="role" required>
          <USelect
            v-model="state.role"
            :options="[
              { label: 'Utilisateur', value: 'utilisateur' },
              { label: 'Administrateur', value: 'administrateur' }
            ]"
            option-attribute="label"
            value-attribute="value"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Communes associées" name="communes">
          <div class="space-y-2 max-h-48 overflow-y-auto border border-default rounded-lg p-3">
            <div v-if="!communes || communes.length === 0" class="text-sm text-muted">
              Aucune commune disponible
            </div>
            <label
              v-for="commune in communes"
              :key="commune.id"
              class="flex items-center gap-2 p-2 hover:bg-elevated rounded cursor-pointer"
            >
              <input
                v-model="selectedCommunes"
                type="checkbox"
                :value="commune.id"
                class="rounded border-default"
              >
              <span class="text-sm">{{ commune.name }} ({{ commune.postal_code }})</span>
            </label>
          </div>
        </UFormField>

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
