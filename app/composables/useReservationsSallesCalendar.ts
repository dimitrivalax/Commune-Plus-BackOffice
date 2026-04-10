import { getHours, getMinutes, isSameDay, parseISO, setHours, setMinutes } from 'date-fns'
import type { ReservationSalle } from '~/types'

export type DayPlacedReservation = {
  reservation: ReservationSalle
  startMinutes: number
  endMinutes: number
  columnIndex: number
  columnCount: number
  groupId: number
}

const DAY_START_HOUR = 8
const DAY_END_HOUR = 23
const DAY_START_MINUTES = DAY_START_HOUR * 60
const DAY_END_MINUTES = DAY_END_HOUR * 60
const DAY_DURATION_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES

function getDayIntervalBounds(day: Date): { dayStart: Date, dayEnd: Date } {
  return {
    dayStart: setHours(setMinutes(day, 0), DAY_START_HOUR),
    dayEnd: setHours(setMinutes(day, 0), DAY_END_HOUR),
  }
}

function toMinutes(date: Date): number {
  return getHours(date) * 60 + getMinutes(date)
}

function getReservationIntervalForDay(
  reservation: ReservationSalle,
  day: Date,
): { startMinutes: number, endMinutes: number } | null {
  const { dayStart, dayEnd } = getDayIntervalBounds(day)
  const start = parseISO(reservation.date_debut)
  const end = parseISO(reservation.date_fin)

  const effectiveStart = start < dayStart ? dayStart : start
  const effectiveEnd = end > dayEnd ? dayEnd : end

  if (effectiveEnd <= effectiveStart) return null

  return {
    startMinutes: toMinutes(effectiveStart),
    endMinutes: toMinutes(effectiveEnd),
  }
}

export function useReservationsSallesCalendar() {
  function getDayAgendaReservationsForSalle(
    reservations: ReservationSalle[],
    salleId: string,
    day: Date,
  ): DayPlacedReservation[] {
    const positioned = reservations
      .filter((res) => {
        if (res.salle_id !== salleId) return false
        const start = parseISO(res.date_debut)
        const end = parseISO(res.date_fin)
        return isSameDay(start, day)
          || isSameDay(end, day)
          || (start <= day && end >= day)
      })
      .map((reservation) => {
        const interval = getReservationIntervalForDay(reservation, day)
        if (!interval) return null
        return {
          reservation,
          startMinutes: interval.startMinutes,
          endMinutes: interval.endMinutes,
          columnIndex: 0,
          columnCount: 1,
          groupId: -1,
        } satisfies DayPlacedReservation
      })
      .filter((item): item is DayPlacedReservation => item !== null)
      .sort((a, b) => {
        if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes
        return a.endMinutes - b.endMinutes
      })

    if (!positioned.length) return []

    let currentGroupId = -1
    let maxEndInCurrentGroup = -1
    const groupMaxColumns: Record<number, number> = {}
    const active: DayPlacedReservation[] = []

    positioned.forEach((item) => {
      for (let i = active.length - 1; i >= 0; i--) {
        const activeItem = active[i]
        if (!activeItem) continue
        if (activeItem.endMinutes <= item.startMinutes) {
          active.splice(i, 1)
        }
      }

      if (!active.length || item.startMinutes >= maxEndInCurrentGroup) {
        currentGroupId += 1
        maxEndInCurrentGroup = item.endMinutes
      }
      else if (item.endMinutes > maxEndInCurrentGroup) {
        maxEndInCurrentGroup = item.endMinutes
      }

      const usedColumns = new Set(active.map(activeItem => activeItem.columnIndex))
      let nextColumnIndex = 0
      while (usedColumns.has(nextColumnIndex)) {
        nextColumnIndex += 1
      }

      item.groupId = currentGroupId
      item.columnIndex = nextColumnIndex
      active.push(item)

      const groupColumnCount = Math.max(
        groupMaxColumns[currentGroupId] || 1,
        nextColumnIndex + 1,
      )
      groupMaxColumns[currentGroupId] = groupColumnCount
    })

    return positioned.map(item => ({
      ...item,
      columnCount: groupMaxColumns[item.groupId] || 1,
    }))
  }

  function getDayAgendaReservationStyle(item: DayPlacedReservation): Record<string, string> {
    const top = ((item.startMinutes - DAY_START_MINUTES) / DAY_DURATION_MINUTES) * 100
    const rawHeight = ((item.endMinutes - item.startMinutes) / DAY_DURATION_MINUTES) * 100
    const height = Math.max(rawHeight, 2.5)
    const widthPct = 100 / item.columnCount
    const leftPct = widthPct * item.columnIndex

    return {
      top: `${top}%`,
      height: `${height}%`,
      width: `calc(${widthPct}% - 6px)`,
      left: `calc(${leftPct}% + 3px)`,
    }
  }

  return {
    dayStartHour: DAY_START_HOUR,
    dayEndHour: DAY_END_HOUR,
    dayStartMinutes: DAY_START_MINUTES,
    dayEndMinutes: DAY_END_MINUTES,
    dayDurationMinutes: DAY_DURATION_MINUTES,
    getDayAgendaReservationsForSalle,
    getDayAgendaReservationStyle,
  }
}
