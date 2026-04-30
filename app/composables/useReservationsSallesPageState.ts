import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks
} from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ReservationSalle, Salle } from '~/types'

export type ViewType = 'day' | 'week' | 'month'

type VacancesRecord = {
  description: string
  start_date: string
  end_date: string
}

type VacancesResponse = {
  zone: 'A' | 'B' | 'C' | null
  error?: string
  vacances: VacancesRecord[]
}

export async function useReservationsSallesPageState() {
  const { currentCommune } = useCurrentCommune()
  const { getAuthHeaders } = useApiAuth()

  const currentView = ref<ViewType>('week')
  const currentDate = ref(new Date())
  const selectedSalleIds = ref<string[]>([])
  const reservationStatusOptions: ReservationSalle['status'][] = ['en_attente', 'confirmée', 'refusée']
  const selectedReservationStatuses = ref<ReservationSalle['status'][]>([...reservationStatusOptions])
  const addModalProps = ref<{
    salleId?: string
    dateDebut?: Date
    dateFin?: Date
  }>({})

  const isReservationsMobileDisabled = computed(
    () => currentCommune.value?.feature_reservations_salles === false
  )

  const dateRange = computed(() => {
    switch (currentView.value) {
      case 'day':
        return { start: startOfDay(currentDate.value), end: endOfDay(currentDate.value) }
      case 'week':
        return {
          start: startOfWeek(currentDate.value, { locale: fr }),
          end: endOfWeek(currentDate.value, { locale: fr })
        }
      case 'month':
        return {
          start: startOfMonth(currentDate.value),
          end: endOfMonth(currentDate.value)
        }
    }
  })

  const { data: salles, refresh: refreshSalles } = await useFetch<Salle[]>('/api/salles', {
    lazy: true,
    headers: computed(() => getAuthHeaders()),
    query: computed(() => ({
      commune_id: currentCommune.value?.id
    }))
  })

  const { data: reservations, status, refresh: refreshReservations } = await useFetch<ReservationSalle[]>('/api/reservations-salles', {
    lazy: true,
    headers: computed(() => getAuthHeaders()),
    query: computed(() => ({
      date_debut: dateRange.value.start.toISOString(),
      date_fin: dateRange.value.end.toISOString(),
      commune_id: currentCommune.value?.id
    }))
  })

  const {
    data: vacancesResponse,
    refresh: refreshVacances
  } = await useFetch<VacancesResponse>('/api/vacances-scolaires', {
    lazy: true,
    immediate: false,
    headers: computed(() => getAuthHeaders()),
    query: computed(() => {
      const codePostal = currentCommune.value?.postal_code
      if (!codePostal) return {}
      return {
        code_postal: codePostal,
        date_debut: dateRange.value.start.toISOString(),
        date_fin: dateRange.value.end.toISOString()
      }
    })
  })

  watch(
    salles,
    (newSalles) => {
      if (!newSalles?.length) {
        selectedSalleIds.value = []
        return
      }

      const availableSalleIds = newSalles.map(salle => salle.id)
      if (!selectedSalleIds.value.length) {
        selectedSalleIds.value = availableSalleIds
        return
      }

      selectedSalleIds.value = selectedSalleIds.value.filter(id => availableSalleIds.includes(id))
    },
    { immediate: true }
  )

  watch(currentCommune, () => {
    refreshSalles()
    refreshReservations()
    refreshVacances()
  })

  watch(
    [
      () => currentCommune.value?.postal_code,
      () => dateRange.value.start.getTime(),
      () => dateRange.value.end.getTime()
    ],
    ([postalCode]) => {
      if (!postalCode) return
      refreshVacances()
    },
    { immediate: true }
  )

  const filteredReservations = computed(() => {
    if (!reservations.value) return []
    return reservations.value.filter((res) => {
      if (!selectedReservationStatuses.value.includes(res.status)) return false
      const resStart = parseISO(res.date_debut)
      const resEnd = parseISO(res.date_fin)
      return isWithinInterval(resStart, dateRange.value)
        || isWithinInterval(resEnd, dateRange.value)
        || (resStart <= dateRange.value.start && resEnd >= dateRange.value.end)
    })
  })

  const displayedSalles = computed(() => {
    if (!salles.value?.length) return []
    return salles.value.filter(salle => selectedSalleIds.value.includes(salle.id))
  })

  const daysToShow = computed(() => {
    switch (currentView.value) {
      case 'day':
        return [currentDate.value]
      case 'week':
        return eachDayOfInterval({ start: dateRange.value.start, end: dateRange.value.end })
      case 'month': {
        const monthStart = startOfMonth(currentDate.value)
        const monthEnd = endOfMonth(currentDate.value)
        const weekStart = startOfWeek(monthStart, { locale: fr })
        const weekEnd = endOfWeek(monthEnd, { locale: fr })
        return eachDayOfInterval({ start: weekStart, end: weekEnd })
      }
    }
  })

  const weeksInMonth = computed(() => {
    if (currentView.value !== 'month') return []
    const days = daysToShow.value
    const weeks: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    return weeks
  })

  const hours = computed(() => {
    const h: number[] = []
    for (let i = 8; i <= 22; i++) h.push(i)
    return h
  })

  function goToToday() {
    currentDate.value = new Date()
  }

  function goToPrevious() {
    switch (currentView.value) {
      case 'day':
        currentDate.value = subDays(currentDate.value, 1)
        break
      case 'week':
        currentDate.value = subWeeks(currentDate.value, 1)
        break
      case 'month':
        currentDate.value = subMonths(currentDate.value, 1)
        break
    }
  }

  function goToNext() {
    switch (currentView.value) {
      case 'day':
        currentDate.value = addDays(currentDate.value, 1)
        break
      case 'week':
        currentDate.value = addWeeks(currentDate.value, 1)
        break
      case 'month':
        currentDate.value = addMonths(currentDate.value, 1)
        break
    }
  }

  function getReservationsForSalleAndDay(salleId: string, day: Date): ReservationSalle[] {
    return filteredReservations.value.filter((res) => {
      if (res.salle_id !== salleId) return false
      const resStart = parseISO(res.date_debut)
      const resEnd = parseISO(res.date_fin)
      return isSameDay(resStart, day) || isSameDay(resEnd, day)
        || (resStart <= day && resEnd >= day)
    })
  }

  function getReservationsForDay(day: Date): ReservationSalle[] {
    return filteredReservations.value.filter((res) => {
      if (!selectedSalleIds.value.includes(res.salle_id)) return false
      const resStart = parseISO(res.date_debut)
      const resEnd = parseISO(res.date_fin)
      return isSameDay(resStart, day) || isSameDay(resEnd, day)
        || (resStart <= day && resEnd >= day)
    })
  }

  function getSalleName(salleId: string): string {
    return salles.value?.find(salle => salle.id === salleId)?.nom || 'Salle inconnue'
  }

  function toggleSalleSelection(salleId: string, checked: boolean) {
    if (checked) {
      if (!selectedSalleIds.value.includes(salleId)) {
        selectedSalleIds.value = [...selectedSalleIds.value, salleId]
      }
      return
    }
    selectedSalleIds.value = selectedSalleIds.value.filter(id => id !== salleId)
  }

  function toggleReservationStatusSelection(status: ReservationSalle['status'], checked: boolean) {
    if (checked) {
      if (!selectedReservationStatuses.value.includes(status)) {
        selectedReservationStatuses.value = [...selectedReservationStatuses.value, status]
      }
      return
    }
    selectedReservationStatuses.value = selectedReservationStatuses.value.filter(value => value !== status)
  }

  const salleColorPalette = [
    'bg-primary/20 border-primary hover:bg-primary/35',
    'bg-success/20 border-success hover:bg-success/35',
    'bg-warning/20 border-warning hover:bg-warning/35',
    'bg-error/20 border-error hover:bg-error/35',
    'bg-info/20 border-info hover:bg-info/35'
  ]

  function getSalleColorClasses(salleId: string): string {
    if (!salles.value?.length) return 'bg-elevated border-default hover:bg-elevated/80'
    const index = salles.value.findIndex(salle => salle.id === salleId)
    if (index < 0) return 'bg-elevated border-default hover:bg-elevated/80'
    return salleColorPalette[index % salleColorPalette.length] || 'bg-elevated border-default hover:bg-elevated/80'
  }

  function getReservationStatusLabel(statusValue?: ReservationSalle['status']): string {
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

  function formatReservationDateTime(date: string): string {
    return format(parseISO(date), 'dd/MM/yyyy HH:mm')
  }

  function isDayInVacances(day: Date): boolean {
    const vacances = vacancesResponse.value?.vacances
    if (!vacances?.length) return false
    const dayTime = day.getTime()
    return vacances.some((vacance) => {
      const start = new Date(vacance.start_date).getTime()
      const end = new Date(vacance.end_date).getTime()
      return !Number.isNaN(start) && !Number.isNaN(end) && dayTime >= start && dayTime <= end
    })
  }

  function getVacancesDescriptionForDay(day: Date): string | null {
    const vacances = vacancesResponse.value?.vacances
    if (!vacances?.length) return null
    const dayTime = day.getTime()
    const match = vacances.find((vacance) => {
      const start = new Date(vacance.start_date).getTime()
      const end = new Date(vacance.end_date).getTime()
      return !Number.isNaN(start) && !Number.isNaN(end) && dayTime >= start && dayTime <= end
    })
    return match?.description || null
  }

  return {
    currentView,
    currentDate,
    selectedSalleIds,
    reservationStatusOptions,
    selectedReservationStatuses,
    addModalProps,
    isReservationsMobileDisabled,
    dateRange,
    salles,
    reservations,
    status,
    vacancesResponse,
    filteredReservations,
    displayedSalles,
    daysToShow,
    weeksInMonth,
    hours,
    refreshReservations,
    goToToday,
    goToPrevious,
    goToNext,
    getReservationsForSalleAndDay,
    getReservationsForDay,
    getSalleName,
    toggleSalleSelection,
    toggleReservationStatusSelection,
    getSalleColorClasses,
    getReservationStatusLabel,
    formatReservationDateTime,
    isDayInVacances,
    getVacancesDescriptionForDay
  }
}
