<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ReservationSalle } from '~/types'
import { getErrorMessage } from '~/utils/errorMessage'

const props = defineProps<{
  reservation: ReservationSalle | null
}>()

const emit = defineEmits<{
  delete: [reservation: ReservationSalle]
}>()

const schema = z.object({
  date_debut: z.string().min(1, 'La date de début est requise'),
  date_fin: z.string().min(1, 'La date de fin est requise'),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(1, 'Le téléphone est requis'),
  nom_association: z.string().optional(),
  status: z.enum(['en_attente', 'confirmée', 'refusée']).optional()
}).refine((data) => {
  const debut = new Date(data.date_debut)
  const fin = new Date(data.date_fin)
  return fin > debut
}, {
  message: 'La date de fin doit être après la date de début',
  path: ['date_fin']
})

const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  date_debut: undefined,
  date_fin: undefined,
  nom: undefined,
  prenom: undefined,
  email: undefined,
  telephone: undefined,
  nom_association: undefined,
  status: undefined
})

const toast = useToast()
const refresh = inject<() => void>('refresh-reservations-salles')
const { updateReservation } = useReservationsSallesService()
const { salles, loadSalles: loadSallesList } = useSallesList()

const statusOptions = computed(() => [
  { label: 'En attente', value: 'en_attente' },
  { label: 'Confirmée', value: 'confirmée' },
  { label: 'Refusée', value: 'refusée' }
])

function formatDateTimeLocal(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

watch(() => props.reservation, (newVal) => {
  if (newVal) {
    state.date_debut = formatDateTimeLocal(newVal.date_debut)
    state.date_fin = formatDateTimeLocal(newVal.date_fin)
    state.nom = newVal.nom
    state.prenom = newVal.prenom
    state.email = newVal.email
    state.telephone = newVal.telephone
    state.nom_association = newVal.nom_association || undefined
    state.status = newVal.status || 'en_attente'
  }
}, { immediate: true })

async function loadSalles() {
  try {
    await loadSallesList()
  } catch {
    // Non bloquant pour l'édition, on garde "Salle inconnue" si besoin.
  }
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.reservation) return

  try {
    await updateReservation(props.reservation.id, {
      date_debut: new Date(event.data.date_debut).toISOString(),
      date_fin: new Date(event.data.date_fin).toISOString(),
      nom: event.data.nom,
      prenom: event.data.prenom,
      email: event.data.email,
      telephone: event.data.telephone,
      nom_association: event.data.nom_association || null,
      status: event.data.status || 'en_attente'
    })

    toast.add({
      title: 'Succès',
      description: 'La réservation a été modifiée',
      color: 'success'
    })

    open.value = false

    if (refresh) {
      refresh()
    }
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: getErrorMessage(error, 'Une erreur est survenue lors de la modification'),
      color: 'error'
    })
  }
}

function handleDelete() {
  if (props.reservation) {
    emit('delete', props.reservation)
  }
  open.value = false
}

function openModal() {
  void loadSalles()
  open.value = true
}

defineExpose({
  openModal
})
</script>

<template>
  <UModal v-model:open="open" title="Modifier la réservation" description="Modifier une réservation de salle">
    <template #body>
      <div v-if="reservation" class="mb-4 p-3 bg-elevated rounded-lg">
        <p class="text-sm text-muted">
          Salle :
        </p>
        <p class="font-medium">
          {{ salles?.find(s => s.id === reservation.salle_id)?.nom || 'Salle inconnue' }}
        </p>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Date et heure de début" name="date_debut" required>
          <UInput v-model="state.date_debut" type="datetime-local" class="w-full" />
        </UFormField>

        <UFormField label="Date et heure de fin" name="date_fin" required>
          <UInput v-model="state.date_fin" type="datetime-local" class="w-full" />
        </UFormField>

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
          label="Téléphone"
          placeholder="06 12 34 56 78"
          name="telephone"
          required
        >
          <UInput v-model="state.telephone" type="tel" class="w-full" />
        </UFormField>

        <UFormField label="Nom de l'association" placeholder="Association XYZ (optionnel)" name="nom_association">
          <UInput v-model="state.nom_association" class="w-full" />
        </UFormField>

        <UFormField label="Statut" name="status" required>
          <USelect
            v-model="state.status"
            :items="statusOptions"
            placeholder="Sélectionner un statut"
            class="w-full"
          />
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
