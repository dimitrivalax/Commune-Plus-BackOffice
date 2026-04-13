import type { ReservationSalle, Salle } from '~/types'

interface RecurrencePreviewResponse {
  total: number
  estimated: number
  skippedVacancesCount: number
}

interface RecurrencePreviewPayload {
  salle_id: string
  date_debut: string
  inclure_vacances_scolaires: boolean
}

interface CreateReservationSallePayload {
  salle_id: string
  date_debut: string
  date_fin: string
  nom: string
  prenom: string
  email: string
  telephone: string
  is_association: boolean
  nom_association: string | null
  reservation_recurrente: boolean
  inclure_vacances_scolaires: boolean
}

export const useReservationsSallesService = () => {
  const { getAuthHeaders } = useApiAuth()

  const getSalles = () => $fetch<Salle[]>('/api/salles', {
    headers: getAuthHeaders()
  })

  const previewRecurrence = (payload: RecurrencePreviewPayload) => $fetch<RecurrencePreviewResponse>('/api/reservations-salles/recurrence-preview', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: payload
  })

  const createReservation = (payload: CreateReservationSallePayload) => $fetch<ReservationSalle>('/api/reservations-salles/create', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: payload
  })

  return {
    getSalles,
    previewRecurrence,
    createReservation
  }
}
