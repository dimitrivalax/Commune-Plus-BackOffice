<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ReservationSalle, Salle } from '~/types'

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
  is_association: z.boolean().default(false),
  nom_association: z.string().optional(),
  reservation_recurrente: z.boolean().default(false),
  inclure_vacances_scolaires: z.boolean().default(false)
}).superRefine((data, ctx) => {
  if (data.is_association && !data.nom_association?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le nom de l\'association est requis',
      path: ['nom_association']
    })
  }
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
  is_association: false,
  nom_association: undefined,
  reservation_recurrente: false,
  inclure_vacances_scolaires: false
})

function openModal() {
  open.value = true
}

defineExpose({
  openModal
})

const toast = useToast()
const refresh = inject<() => void>('refresh-reservations-salles')
const { getAuthHeaders } = useApiAuth()
const recurrenceSummary = ref<{
  total: number
  createdCount: number
  conflictCount: number
  skippedVacancesCount: number
  conflicts: Array<{ date: string, start_time: string, end_time: string }>
} | null>(null)
const estimatedOccurrences = ref(1)
const estimatedSkippedVacances = ref(0)

function estimateSchoolYearOccurrences(dateDebut: string): number {
  const start = new Date(dateDebut)
  if (Number.isNaN(start.getTime())) return 1

  const month = start.getMonth() + 1
  const schoolYearStart = month >= 8 ? start.getFullYear() : start.getFullYear() - 1
  const schoolYearEnd = new Date(schoolYearStart + 1, 6, 31, 23, 59, 59, 999)
  const cursor = new Date(start)

  let count = 0
  while (cursor <= schoolYearEnd) {
    count += 1
    cursor.setDate(cursor.getDate() + 7)
  }

  return count
}

watch(
  () => [state.salle_id, state.date_debut, state.is_association, state.reservation_recurrente, state.inclure_vacances_scolaires],
  async (_, __, onCleanup) => {
    if (!state.is_association || !state.reservation_recurrente || !state.date_debut) {
      estimatedOccurrences.value = 1
      estimatedSkippedVacances.value = 0
      return
    }

    let cancelled = false
    const baseEstimate = estimateSchoolYearOccurrences(state.date_debut)
    estimatedOccurrences.value = baseEstimate
    estimatedSkippedVacances.value = 0

    // Sans salle sélectionnée, on ne peut pas calculer les vacances par commune.
    // On garde alors l'estimation locale brute (hebdomadaire) uniquement.
    if (!state.salle_id) {
      return
    }

    const timer = setTimeout(async () => {
      try {
        const withVacancesPromise = $fetch<{
          total: number
          estimated: number
          skippedVacancesCount: number
        }>('/api/reservations-salles/recurrence-preview', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: {
            salle_id: state.salle_id,
            date_debut: new Date(state.date_debut!).toISOString(),
            inclure_vacances_scolaires: true
          }
        })

        const withoutVacancesPromise = $fetch<{
          total: number
          estimated: number
          skippedVacancesCount: number
        }>('/api/reservations-salles/recurrence-preview', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: {
            salle_id: state.salle_id,
            date_debut: new Date(state.date_debut!).toISOString(),
            inclure_vacances_scolaires: false
          }
        })

        const [withVacances, withoutVacances] = await Promise.all([
          withVacancesPromise,
          withoutVacancesPromise
        ])

        if (!cancelled) {
          estimatedSkippedVacances.value = withoutVacances.skippedVacancesCount
          estimatedOccurrences.value = state.inclure_vacances_scolaires
            ? withVacances.estimated
            : withoutVacances.estimated
        }
      } catch {
        if (!cancelled) {
          estimatedOccurrences.value = baseEstimate
          estimatedSkippedVacances.value = 0
        }
      }
    }, 150)

    onCleanup(() => {
      cancelled = true
      if (timer) clearTimeout(timer)
    })
  },
  { immediate: true }
)

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
    state.is_association = false
    state.nom_association = undefined
    state.reservation_recurrente = false
    state.inclure_vacances_scolaires = false
    recurrenceSummary.value = null
    estimatedOccurrences.value = 1
    estimatedSkippedVacances.value = 0
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
    recurrenceSummary.value = null

    const response = await $fetch('/api/reservations-salles/create', {
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
        is_association: event.data.is_association ?? false,
        nom_association: event.data.is_association ? (event.data.nom_association || null) : null,
        reservation_recurrente: event.data.is_association ? (event.data.reservation_recurrente ?? false) : false,
        inclure_vacances_scolaires: event.data.is_association && event.data.reservation_recurrente
          ? (event.data.inclure_vacances_scolaires ?? false)
          : false
      }
    }) as ReservationSalle

    if (response?.recurrence_summary) {
      recurrenceSummary.value = response.recurrence_summary
      toast.add({
        title: 'Succès',
        description: `Récurrence traitée: ${response.recurrence_summary.createdCount}/${response.recurrence_summary.total} réservations créées`,
        color: 'success'
      })
    } else {
      toast.add({
        title: 'Succès',
        description: 'La réservation a été créée',
        color: 'success'
      })
    }

    // Réinitialiser le formulaire
    state.salle_id = props.salleId || undefined
    state.date_debut = props.dateDebut ? formatDateTimeLocal(props.dateDebut) : undefined
    state.date_fin = props.dateFin ? formatDateTimeLocal(props.dateFin) : undefined
    state.nom = undefined
    state.prenom = undefined
    state.email = undefined
    state.telephone = undefined
    state.is_association = false
    state.nom_association = undefined
    state.reservation_recurrente = false
    state.inclure_vacances_scolaires = false

    if (!response?.recurrence_summary) {
      open.value = false
    }

    if (refresh) {
      refresh()
    }
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({
      title: 'Erreur',
      description: e.data?.message || e.message || 'Une erreur est survenue lors de la création',
      color: 'error'
    })
  }
}
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

        <UFormField name="is_association">
          <label class="flex items-center gap-2 p-2 border border-default rounded-lg">
            <input
              v-model="state.is_association"
              type="checkbox"
              class="rounded border-default"
            >
            <span>Réservation pour une association</span>
          </label>
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

        <UFormField
          v-if="state.is_association"
          label="Nom de l'association"
          placeholder="Association XYZ"
          name="nom_association"
          required
        >
          <UInput v-model="state.nom_association" class="w-full" />
        </UFormField>

        <UFormField
          v-if="state.is_association"
          name="reservation_recurrente"
        >
          <label class="flex items-center gap-2 p-2 border border-default rounded-lg">
            <input
              v-model="state.reservation_recurrente"
              type="checkbox"
              class="rounded border-default"
            >
            <span>Réservation récurrente toutes les semaines (année scolaire)</span>
          </label>
        </UFormField>

        <UFormField
          v-if="state.is_association && state.reservation_recurrente"
          name="inclure_vacances_scolaires"
        >
          <label class="flex items-center gap-2 p-2 border border-default rounded-lg">
            <input
              v-model="state.inclure_vacances_scolaires"
              type="checkbox"
              class="rounded border-default"
            >
            <span>Inclure les occurrences pendant les vacances scolaires</span>
          </label>
        </UFormField>

        <div
          v-if="state.is_association && state.reservation_recurrente"
          class="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm space-y-1"
        >
          <p>
            Occurrences estimées sur l'année scolaire : <strong>{{ estimatedOccurrences }}</strong>
            ({{ state.inclure_vacances_scolaires ? 'avec vacances' : 'hors vacances' }})
          </p>
          <p v-if="!state.inclure_vacances_scolaires && estimatedSkippedVacances > 0" class="text-muted">
            {{ estimatedSkippedVacances }} occurrence(s) pendant les vacances seront ignorées.
          </p>
          <div class="mt-2 p-2 rounded-md bg-success/15 border border-success/30 text-success font-medium">
            Les réservations récurrentes sont confirmées par défaut.
          </div>
        </div>

        <div
          v-if="recurrenceSummary"
          class="p-3 bg-elevated border border-default rounded-lg text-sm space-y-1"
        >
          <p><strong>Bilan de la récurrence</strong></p>
          <p>Total: {{ recurrenceSummary.total }}</p>
          <p>Créées: {{ recurrenceSummary.createdCount }}</p>
          <p>Conflits: {{ recurrenceSummary.conflictCount }}</p>
          <p>Ignorées (vacances): {{ recurrenceSummary.skippedVacancesCount }}</p>
          <p v-if="recurrenceSummary.conflicts.length > 0" class="pt-1">
            Créneaux en conflit:
          </p>
          <ul v-if="recurrenceSummary.conflicts.length > 0" class="list-disc pl-5 space-y-0.5">
            <li
              v-for="(conflict, index) in recurrenceSummary.conflicts.slice(0, 5)"
              :key="`${conflict.date}-${index}`"
            >
              {{ conflict.date }} ({{ conflict.start_time }} - {{ conflict.end_time }})
            </li>
          </ul>
          <p v-if="recurrenceSummary.conflicts.length > 5" class="text-muted">
            ... et {{ recurrenceSummary.conflicts.length - 5 }} autres conflits.
          </p>
        </div>

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
