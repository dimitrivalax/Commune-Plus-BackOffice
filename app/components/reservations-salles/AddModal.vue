<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Salle } from '~/types'

const props = defineProps<{
  salleId?: string
  dateDebut?: Date
  dateFin?: Date
}>()

const schema = z.object({
  salle_id: z.string().min(1, 'La salle est requise'),
  date_debut: z.string().min(1, 'La date de début est requise'),
  date_fin: z.string().min(1, 'La date de fin est requise'),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(1, 'Le téléphone est requis'),
  nom_association: z.string().optional()
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
  salle_id: props.salleId || undefined,
  date_debut: props.dateDebut ? formatDateTimeLocal(props.dateDebut) : undefined,
  date_fin: props.dateFin ? formatDateTimeLocal(props.dateFin) : undefined,
  nom: undefined,
  prenom: undefined,
  email: undefined,
  telephone: undefined,
  nom_association: undefined
})

const toast = useToast()
const refresh = inject<() => void>('refresh-reservations-salles')
const { getAuthHeaders } = useApiAuth()

// Charger les salles pour le select
const { data: salles, refresh: refreshSalles } = await useFetch<Salle[]>('/api/salles', {
  lazy: true,
  headers: getAuthHeaders()
})

// Recharger les salles quand le modal s'ouvre
watch(() => open.value, async (isOpen) => {
  if (isOpen) {
    await refreshSalles()
    // Réinitialiser avec les props quand le modal s'ouvre
    state.salle_id = props.salleId || undefined
    state.date_debut = props.dateDebut ? formatDateTimeLocal(props.dateDebut) : undefined
    state.date_fin = props.dateFin ? formatDateTimeLocal(props.dateFin) : undefined
    state.nom = undefined
    state.prenom = undefined
    state.email = undefined
    state.telephone = undefined
    state.nom_association = undefined
  }
})

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}


watch(() => props.salleId, (newVal) => {
  if (newVal && open.value) state.salle_id = newVal
})

watch(() => props.dateDebut, (newVal) => {
  if (newVal && open.value) state.date_debut = formatDateTimeLocal(newVal)
})

watch(() => props.dateFin, (newVal) => {
  if (newVal && open.value) state.date_fin = formatDateTimeLocal(newVal)
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await $fetch('/api/reservations-salles/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        salle_id: event.data.salle_id,
        date_debut: new Date(event.data.date_debut).toISOString(),
        date_fin: new Date(event.data.date_fin).toISOString(),
        nom: event.data.nom,
        prenom: event.data.prenom,
        email: event.data.email,
        telephone: event.data.telephone,
        nom_association: event.data.nom_association || null
      }
    })

    toast.add({
      title: 'Succès',
      description: 'La réservation a été créée',
      color: 'success'
    })

    // Réinitialiser le formulaire
    state.salle_id = props.salleId || undefined
    state.date_debut = props.dateDebut ? formatDateTimeLocal(props.dateDebut) : undefined
    state.date_fin = props.dateFin ? formatDateTimeLocal(props.dateFin) : undefined
    state.nom = undefined
    state.prenom = undefined
    state.email = undefined
    state.telephone = undefined
    state.nom_association = undefined

    open.value = false

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
  open.value = true
}

defineExpose({
  openModal
})
</script>

<template>
  <UModal v-model:open="open" title="Nouvelle réservation" description="Créer une nouvelle réservation de salle">
    <UButton label="Nouvelle réservation" icon="i-lucide-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Salle" name="salle_id" required>
          <USelect
            v-model="state.salle_id"
            :items="salles?.map(s => ({ label: s.nom, value: s.id })) || []"
            placeholder="Sélectionner une salle"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Date et heure de début" name="date_debut" required>
          <UInput v-model="state.date_debut" type="datetime-local" class="w-full" />
        </UFormField>

        <UFormField label="Date et heure de fin" name="date_fin" required>
          <UInput v-model="state.date_fin" type="datetime-local" class="w-full" />
        </UFormField>

        <UFormField label="Nom" placeholder="Dupont" name="nom" required>
          <UInput v-model="state.nom" class="w-full" />
        </UFormField>

        <UFormField label="Prénom" placeholder="Jean" name="prenom" required>
          <UInput v-model="state.prenom" class="w-full" />
        </UFormField>

        <UFormField label="Email" placeholder="jean.dupont@exemple.com" name="email" required>
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>

        <UFormField label="Téléphone" placeholder="06 12 34 56 78" name="telephone" required>
          <UInput v-model="state.telephone" type="tel" class="w-full" />
        </UFormField>

        <UFormField label="Nom de l'association" placeholder="Association XYZ (optionnel)" name="nom_association">
          <UInput v-model="state.nom_association" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2">
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
