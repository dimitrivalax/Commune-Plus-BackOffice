import { requireAuth } from '../utils/firebase-auth'
import {
  codePostalToZone,
  fetchVacancesScolaires,
  type VacancesRecord,
} from '../utils/vacances-scolaires.service'

function overlapsInterval(
  start: string,
  end: string,
  rangeStart?: string,
  rangeEnd?: string,
): boolean {
  if (!rangeStart && !rangeEnd) return true

  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return false

  const min = rangeStart ? new Date(rangeStart).getTime() : Number.NEGATIVE_INFINITY
  const max = rangeEnd ? new Date(rangeEnd).getTime() : Number.POSITIVE_INFINITY
  if (Number.isNaN(min) || Number.isNaN(max)) return true

  return startTime <= max && endTime >= min
}

export default eventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const codePostal = String(query.code_postal || '').trim()
  const dateDebut = typeof query.date_debut === 'string' ? query.date_debut : undefined
  const dateFin = typeof query.date_fin === 'string' ? query.date_fin : undefined

  if (!codePostal) {
    throw createError({
      statusCode: 400,
      message: 'Le code postal est requis',
    })
  }

  const zone = codePostalToZone(codePostal)
  if (!zone) {
    return {
      zone: null,
      error: 'Zone inconnue pour ce code postal',
      vacances: [],
    }
  }

  // Cible les années scolaires de la plage demandée pour éviter
  // de dépendre d'un tri implicite de l'API open data.
  const schoolYears = new Set<string>()
  const bounds = [dateDebut, dateFin].filter(Boolean) as string[]
  for (const bound of bounds) {
    const d = new Date(bound)
    if (Number.isNaN(d.getTime())) continue
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth() + 1
    if (m >= 9) {
      schoolYears.add(`${y}-${y + 1}`)
    } else {
      schoolYears.add(`${y - 1}-${y}`)
    }
  }
  if (schoolYears.size === 0) {
    const now = new Date()
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth() + 1
    schoolYears.add(m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`)
  }

  let vacancesByYear: VacancesRecord[][]
  try {
    vacancesByYear = await Promise.all(
      Array.from(schoolYears).map((anneeScolaire) =>
        fetchVacancesScolaires(zone, {
          limit: 200,
          anneeScolaire,
        }),
      ),
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return {
      zone,
      error: message,
      vacances: [],
    }
  }

  const merged = new Map<string, VacancesRecord>()
  for (const records of vacancesByYear) {
    for (const record of records) {
      const key = `${record.start_date}|${record.end_date}|${record.description}`
      if (!merged.has(key)) merged.set(key, record)
    }
  }

  const vacances = Array.from(merged.values()).filter((vacance) =>
    overlapsInterval(vacance.start_date, vacance.end_date, dateDebut, dateFin),
  )

  return {
    zone,
    error: undefined,
    vacances,
  }
})
