import { FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'node:crypto'
import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { serializeFirestoreData } from '../../utils/firestore-serialize'
import { sendReservationConfirmationEmail } from '../../utils/resend-transactional'
import { getVacancesByCodePostal, isDateEnVacances, type VacancesRecord } from '../../utils/vacances-scolaires.service'

type CreateReservationInput = {
  salle_id: string
  date_debut: string
  date_fin: string
  nom: string
  prenom: string
  email: string
  telephone: string
  nom_association?: string | null
  status?: 'en_attente' | 'confirmée' | 'refusée'
}

function toDatePart(date: Date): string {
  return date.toISOString().split('T')[0]!
}

function toTimePart(date: Date): string {
  return date.toTimeString().substring(0, 5)
}

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

function buildWeeklyOccurrences(dateDebut: Date, dateFin: Date): Array<{ start: Date; end: Date }> {
  const bounds = getSchoolYearBounds(dateDebut)
  const occurrences: Array<{ start: Date; end: Date }> = []

  let startCursor = new Date(dateDebut)
  let endCursor = new Date(dateFin)
  while (startCursor <= bounds.end) {
    if (startCursor >= bounds.start) {
      occurrences.push({
        start: new Date(startCursor),
        end: new Date(endCursor),
      })
    }
    startCursor.setDate(startCursor.getDate() + 7)
    endCursor.setDate(endCursor.getDate() + 7)
  }

  return occurrences
}

async function hasOverlapForSlot(
  salleId: string,
  date: string,
  startTime: string,
  endTime: string,
) {
  const db = getAdminFirestore()
  const allSnap = await db
    .collection('reservation_salle')
    .where('salle_id', '==', salleId)
    .where('date', '==', date)
    .get()

  return allSnap.docs.some((doc) => {
    const res = doc.data()
    const resStart = String(res.start_time || '00:00').substring(0, 5)
    const resEnd = String(res.end_time || '23:59').substring(0, 5)
    return resStart < endTime && resEnd > startTime
  })
}

async function createOneReservation(
  input: CreateReservationInput,
  salleData: Record<string, unknown>,
) {
  const db = getAdminFirestore()
  const dateDebutDate = new Date(input.date_debut)
  const dateFinDate = new Date(input.date_fin)
  const date = toDatePart(dateDebutDate)
  const startTime = toTimePart(dateDebutDate)
  const endTime = toTimePart(dateFinDate)

  const overlapping = await hasOverlapForSlot(input.salle_id, date, startTime, endTime)
  if (overlapping) {
    throw createError({
      statusCode: 409,
      message: 'Une réservation existe déjà pour cette salle à cet horaire',
    })
  }

  const name = `${input.prenom} ${input.nom}`.trim()
  const id = randomUUID()
  const ref = db.collection('reservation_salle').doc(id)
  await ref.set({
    salle_id: input.salle_id,
    date,
    start_time: startTime,
    end_time: endTime,
    reason: input.nom_association || null,
    name,
    email: input.email,
    phone: input.telephone,
    status: input.status || 'en_attente',
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  })

  const dataSnap = await ref.get()
  const data = serializeFirestoreData({
    id: dataSnap.id,
    ...dataSnap.data(),
  }) as Record<string, unknown>

  try {
    const existSnap = await db
      .collection('backoffice_notification')
      .where('type', '==', 'reservation')
      .where('entity_id', '==', id)
      .limit(1)
      .get()
    if (existSnap.empty) {
      await db.collection('backoffice_notification').add({
        type: 'reservation',
        entity_id: id,
        title: 'Nouvelle réservation',
        message: `${name} a demandé une réservation de salle`,
        is_read: false,
        created_at: FieldValue.serverTimestamp(),
        read_at: null,
      })
    }
  } catch (notifyErr: unknown) {
    console.error('backoffice notification (reservation):', notifyErr)
  }

  try {
    await sendReservationConfirmationEmail({
      email: input.email,
      nom: input.nom,
      prenom: input.prenom,
      telephone: input.telephone,
      nom_association: input.nom_association || null,
      date_debut: input.date_debut,
      date_fin: input.date_fin,
      salle_nom: salleData.nom as string,
      salle_adresse: (salleData.adresse as string) || null,
    })
  } catch (emailError: unknown) {
    console.error('Error sending confirmation email:', emailError)
  }

  return {
    id: data.id,
    salle_id: input.salle_id,
    date_debut: input.date_debut,
    date_fin: input.date_fin,
    nom: input.nom,
    prenom: input.prenom,
    email: input.email,
    telephone: input.telephone,
    nom_association: input.nom_association || null,
    status: data.status || 'en_attente',
    created_at: data.created_at,
    updated_at: data.updated_at,
    salles: {
      id: input.salle_id,
      nom: salleData.nom,
      adresse: salleData.adresse,
    },
  }
}

async function getVacancesForSalleCommune(salleData: Record<string, unknown>, anchorDate: Date) {
  const db = getAdminFirestore()
  const communeId = salleData.commune_id as string | undefined
  if (!communeId) return [] as VacancesRecord[]
  const communeSnap = await db.collection('commune').doc(communeId).get()
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

  try {
    const body = await readBody(event)

    if (
      !body.salle_id
      || !body.date_debut
      || !body.date_fin
      || !body.nom
      || !body.prenom
      || !body.email
      || !body.telephone
    ) {
      throw createError({
        statusCode: 400,
        message:
          'Missing required fields: salle_id, date_debut, date_fin, nom, prenom, email, telephone',
      })
    }

    const dateDebut = new Date(body.date_debut)
    const dateFin = new Date(body.date_fin)
    if (dateFin <= dateDebut) {
      throw createError({
        statusCode: 400,
        message: 'date_fin must be after date_debut',
      })
    }

    const db = getAdminFirestore()
    const salleSnap = await db.collection('salle').doc(body.salle_id).get()
    if (!salleSnap.exists) {
      throw createError({ statusCode: 404, message: 'Salle not found' })
    }
    const salleData = salleSnap.data()!
    const isAssociation = Boolean(body.is_association)
    const isRecurrence = isAssociation && Boolean(body.reservation_recurrente)
    const includeVacances = Boolean(body.inclure_vacances_scolaires)

    if (isAssociation && !String(body.nom_association || '').trim()) {
      throw createError({
        statusCode: 400,
        message: 'Le nom de l\'association est requis',
      })
    }

    if (!isRecurrence) {
      return await createOneReservation({
        salle_id: body.salle_id,
        date_debut: body.date_debut,
        date_fin: body.date_fin,
        nom: body.nom,
        prenom: body.prenom,
        email: body.email,
        telephone: body.telephone,
        nom_association: isAssociation ? (body.nom_association || null) : null,
        status: body.status || 'en_attente',
      }, salleData as Record<string, unknown>)
    }

    const occurrences = buildWeeklyOccurrences(dateDebut, dateFin)
    const vacances = includeVacances ? [] : await getVacancesForSalleCommune(salleData as Record<string, unknown>, dateDebut)

    let createdCount = 0
    let skippedVacancesCount = 0
    const conflicts: Array<{ date: string; start_time: string; end_time: string }> = []
    let firstCreated: Awaited<ReturnType<typeof createOneReservation>> | null = null

    for (const occurrence of occurrences) {
      const date = toDatePart(occurrence.start)
      const startTime = toTimePart(occurrence.start)
      const endTime = toTimePart(occurrence.end)

      if (!includeVacances && isDateEnVacances(occurrence.start, vacances)) {
        skippedVacancesCount += 1
        continue
      }

      const hasOverlap = await hasOverlapForSlot(body.salle_id, date, startTime, endTime)
      if (hasOverlap) {
        conflicts.push({
          date,
          start_time: startTime,
          end_time: endTime,
        })
        continue
      }

      const created = await createOneReservation({
        salle_id: body.salle_id,
        date_debut: occurrence.start.toISOString(),
        date_fin: occurrence.end.toISOString(),
        nom: body.nom,
        prenom: body.prenom,
        email: body.email,
        telephone: body.telephone,
        nom_association: body.nom_association || null,
        status: 'confirmée',
      }, salleData as Record<string, unknown>)
      createdCount += 1
      if (!firstCreated) firstCreated = created
    }

    return {
      ...(firstCreated || {
        id: null,
        salle_id: body.salle_id,
        date_debut: body.date_debut,
        date_fin: body.date_fin,
        nom: body.nom,
        prenom: body.prenom,
        email: body.email,
        telephone: body.telephone,
        nom_association: body.nom_association || null,
        status: 'confirmée',
        created_at: null,
        updated_at: null,
        salles: {
          id: body.salle_id,
          nom: salleData.nom,
          adresse: salleData.adresse,
        },
      }),
      recurrence_summary: {
        total: occurrences.length,
        createdCount,
        conflictCount: conflicts.length,
        skippedVacancesCount,
        conflicts,
      },
    }
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred while creating reservation',
    })
  }
})
