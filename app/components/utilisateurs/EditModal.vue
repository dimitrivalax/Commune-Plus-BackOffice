<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Utilisateur, Commune } from '~/types'

const props = defineProps<{
  utilisateur: Utilisateur | null
}>()

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  numero_de_rue: z.string().optional(),
  rue: z.string().optional(),
  code_postal: z.string().optional(),
  ville: z.string().optional(),
  email: z.string().email('Email invalide'),
  role: z.enum(['utilisateur', 'administrateur'])
})

const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  nom: undefined,
  prenom: undefined,
  numero_de_rue: undefined,
  rue: undefined,
  code_postal: undefined,
  ville: undefined,
  email: undefined,
  role: 'utilisateur' as 'utilisateur' | 'administrateur'
})

const toast = useToast()
const refresh = inject<() => void>('refresh-utilisateurs')
const { getAuthHeaders } = useApiAuth()

// Charger les communes pour l'affichage
const { data: communes } = await useFetch<Commune[]>('/api/communes', {
  lazy: true,
  headers: getAuthHeaders()
})

// Communes sélectionnées pour cet utilisateur
const selectedCommunes = ref<string[]>([])

watch(() => props.utilisateur, (newUtilisateur) => {
  if (newUtilisateur) {
    state.nom = newUtilisateur.nom
    state.prenom = newUtilisateur.prenom
    state.numero_de_rue = newUtilisateur.numero_de_rue || undefined
    state.rue = newUtilisateur.rue || undefined
    state.code_postal = newUtilisateur.code_postal || undefined
    state.ville = newUtilisateur.ville || undefined
    state.email = newUtilisateur.email
    state.role = newUtilisateur.role || 'utilisateur'
    selectedCommunes.value = newUtilisateur.communes?.map(c => c.id) || []
  }
}, { immediate: true })

const emit = defineEmits<{
  delete: [utilisateur: Utilisateur]
}>()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.utilisateur) return

  try {
    await $fetch(`/api/utilisateurs/${props.utilisateur.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: {
        nom: event.data.nom,
        prenom: event.data.prenom,
        numero_de_rue: event.data.numero_de_rue || null,
        rue: event.data.rue || null,
        code_postal: event.data.code_postal || null,
        ville: event.data.ville || null,
        email: event.data.email,
        role: event.data.role || 'utilisateur',
        communes: selectedCommunes.value
      }
    })

    toast.add({
      title: 'Succès',
      description: `L'utilisateur "${event.data.prenom} ${event.data.nom}" a été modifié`,
      color: 'success'
    })

    open.value = false

    if (refresh) {
      refresh()
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || error.message || 'Une erreur est survenue lors de la modification',
      color: 'error'
    })
  }
}

async function handleDelete() {
  if (!props.utilisateur) return

  open.value = false
  emit('delete', props.utilisateur)
}

function openModal() {
  if (props.utilisateur) {
    state.nom = props.utilisateur.nom
    state.prenom = props.utilisateur.prenom
    state.numero_de_rue = props.utilisateur.numero_de_rue || undefined
    state.rue = props.utilisateur.rue || undefined
    state.code_postal = props.utilisateur.code_postal || undefined
    state.ville = props.utilisateur.ville || undefined
    state.email = props.utilisateur.email
    state.role = props.utilisateur.role || 'utilisateur'
    selectedCommunes.value = props.utilisateur.communes?.map(c => c.id) || []
    open.value = true
  }
}

defineExpose({
  openModal
})
</script>

<template>
  <UModal v-model:open="open" title="Modifier l'utilisateur" description="Modifier les informations d'un utilisateur">
    <template #body>
      <div v-if="utilisateur" class="mb-4 p-3 bg-elevated rounded-lg space-y-2">
        <div>
          <p class="text-sm text-muted">Dernière connexion :</p>
          <p class="font-medium">
            <span v-if="utilisateur.last_sign_in_at">
              {{ new Date(utilisateur.last_sign_in_at).toLocaleString('fr-FR') }}
            </span>
            <span v-else class="text-gray-400">Jamais connecté</span>
          </p>
        </div>
        <div>
          <p class="text-sm text-muted">Date de création :</p>
          <p class="font-medium">{{ new Date(utilisateur.created_at).toLocaleString('fr-FR') }}</p>
        </div>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nom" placeholder="Dupont" name="nom" required>
          <UInput v-model="state.nom" class="w-full" />
        </UFormField>

        <UFormField label="Prénom" placeholder="Jean" name="prenom" required>
          <UInput v-model="state.prenom" class="w-full" />
        </UFormField>

        <UFormField label="Email" placeholder="jean.dupont@exemple.com" name="email" required>
          <UInput v-model="state.email" type="email" class="w-full" />
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

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Numéro de rue" placeholder="10" name="numero_de_rue">
            <UInput v-model="state.numero_de_rue" class="w-full" />
          </UFormField>

          <UFormField label="Rue" placeholder="Rue de la République" name="rue">
            <UInput v-model="state.rue" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Code postal" placeholder="75001" name="code_postal">
            <UInput v-model="state.code_postal" class="w-full" />
          </UFormField>

          <UFormField label="Ville" placeholder="Paris" name="ville">
            <UInput v-model="state.ville" class="w-full" />
          </UFormField>
        </div>

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
                type="checkbox"
                :value="commune.id"
                v-model="selectedCommunes"
                class="rounded border-default"
              />
              <span class="text-sm">{{ commune.name }} ({{ commune.postal_code }})</span>
            </label>
          </div>
        </UFormField>

        <div class="flex justify-between gap-2 pt-2">
          <UButton
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
