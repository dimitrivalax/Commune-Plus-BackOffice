import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { getVacancesByCodePostal, isDateEnVacances, type VacancesRecord } from '../../utils/vacances-scolaires.service'

function getSchoolYearBounds(anchorDate: Date): { start: Date; end: Date } {
  const month = anchorDate.getMonth() + 1
  const startYear = month >= 8 ? anchorDate.getFullYear() : anchorDate.getFullYear() - 1
  return {
    start: new Date(startYear, 7, 1, 0, 0, 0, 0),
    end: new Date(startYear + 1, 6, 31, 23, 59, 59, 999),
  }
}

function getSchoolYearLabelsForAugToJul(anchorDate: Date): [string, string] {
  const month = anchorDate.getMonth() + 1
  const startYear = month >= 8 ? anchorDate.getFullYear() : anchorDate.getFullYear() - 1
  return [`${startYear - 1}-${startYear}`, `${startYear}-${startYear + 1}`]
}

function buildWeeklyOccurrences(dateDebut: Date): Date[] {
  const bounds = getSchoolYearBounds(dateDebut)
  const occurrences: Date[] = []
  const cursor = new Date(dateDebut)
  while (cursor <= bounds.end) {
    if (cursor >= bounds.start) {
      occurrences.push(new Date(cursor))
    }
    cursor.setDate(cursor.getDate() + 7)
  }
  return occurrences
}

async function getVacancesForSalleCommune(salleId: string, anchorDate: Date) {
  const db = getAdminFirestore()
  const salleSnap = await db.collection('salle').doc(salleId).get()
  if (!salleSnap.exists) return [] as VacancesRecord[]
  const salleData = salleSnap.data() as { commune_id?: string } | undefined
  if (!salleData?.commune_id) return [] as VacancesRecord[]

  const communeSnap = await db.collection('commune').doc(salleData.commune_id).get()
  if (!communeSnap.exists) return [] as VacancesRecord[]
  const commune = communeSnap.data() as { postal_code?: string } | undefined
  if (!commune?.postal_code) return [] as VacancesRecord[]

  const [labelPrev, labelCurrent] = getSchoolYearLabelsForAugToJul(anchorDate)
  const [resPrev, resCurrent] = await Promise.all([
    getVacancesByCodePostal(commune.postal_code, { anneeScolaire: labelPrev, limit: 200 }),
    getVacancesByCodePostal(commune.postal_code, { anneeScolaire: labelCurrent, limit: 200 }),
  ])
  const merged = [...(resPrev.vacances || []), ...(resCurrent.vacances || [])]

  const unique = new Map<string, VacancesRecord>()
  for (const v of merged) {
    unique.set(`${v.start_date}_${v.end_date}_${v.description}`, v)
  }

  return [...unique.values()]
}

export default eventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody(event)
  if (!body.salle_id || !body.date_debut) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: salle_id, date_debut',
    })
  }

  const start = new Date(body.date_debut)
  if (Number.isNaN(start.getTime())) {
    throw createError({
      statusCode: 400,
      message: 'Invalid date_debut',
    })
  }

  const includeVacances = Boolean(body.inclure_vacances_scolaires)
  const occurrences = buildWeeklyOccurrences(start)
  if (includeVacances) {
    return {
      total: occurrences.length,
      estimated: occurrences.length,
      skippedVacancesCount: 0,
    }
  }

  const vacances = await getVacancesForSalleCommune(String(body.salle_id), start)
  const skippedVacancesCount = occurrences.filter((d) => isDateEnVacances(d, vacances)).length

  return {
    total: occurrences.length,
    estimated: occurrences.length - skippedVacancesCount,
    skippedVacancesCount,
  }
})
