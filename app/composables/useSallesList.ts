import type { Salle } from '~/types'

export function useSallesList() {
  const { getSalles } = useReservationsSallesService()
  const salles = ref<Salle[]>([])

  async function loadSalles() {
    salles.value = await getSalles()
    return salles.value
  }

  return {
    salles,
    loadSalles
  }
}
