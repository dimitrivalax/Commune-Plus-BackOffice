import type { ReservationSalle } from '~/types'

export type ReservationStatusColor = 'warning' | 'success' | 'error' | 'neutral'

export function getReservationStatusLabel(statusValue?: ReservationSalle['status']): string {
  switch (statusValue) {
    case 'confirmée':
      return 'Confirmée'
    case 'refusée':
      return 'Refusée'
    case 'en_attente':
    default:
      return 'En attente'
  }
}

export function getReservationStatusColor(statusValue?: ReservationSalle['status']): ReservationStatusColor {
  switch (statusValue) {
    case 'confirmée':
      return 'success'
    case 'refusée':
      return 'error'
    case 'en_attente':
    default:
      return 'warning'
  }
}
