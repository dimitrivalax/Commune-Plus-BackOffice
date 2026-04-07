import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'
import {
  requireAuth,
  getCurrentUserProfile,
  getEffectiveCommuneIdForRequest,
} from '../utils/firebase-auth'
import { getAdminFirestore } from '../utils/firebase-admin-app'
import {
  chunkArray,
  docWithId,
  serializeFirestoreData,
} from '../utils/firestore-serialize'

function mapReservationRow(res: Record<string, unknown>, salleInfo: Record<string, unknown>) {
  if (!salleInfo || !res.salle_id) return null

  const nameParts = String(res.name || '').trim().split(' ')
  const prenom = nameParts[0] || ''
  const nom = nameParts.slice(1).join(' ') || prenom

  const dateStr = res.date as string
  let startTimeStr = (res.start_time as string) || '00:00'
  let endTimeStr = (res.end_time as string) || '23:59'

  if (startTimeStr.includes('T')) {
    startTimeStr = startTimeStr.split('T')[1]?.substring(0, 5) || '00:00'
  } else if (startTimeStr.length > 5) {
    startTimeStr = startTimeStr.substring(0, 5)
  }

  if (endTimeStr.includes('T')) {
    endTimeStr = endTimeStr.split('T')[1]?.substring(0, 5) || '23:59'
  } else if (endTimeStr.length > 5) {
    endTimeStr = endTimeStr.substring(0, 5)
  }

  let dateDebut: string
  let dateFin: string

  if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    dateDebut = `${dateStr}T${startTimeStr}:00`
    dateFin = `${dateStr}T${endTimeStr}:00`
  } else if (dateStr && dateStr.includes('T')) {
    const dateOnly = dateStr.split('T')[0]
    dateDebut = `${dateOnly}T${startTimeStr}:00`
    dateFin = `${dateOnly}T${endTimeStr}:00`
  } else {
    const today = new Date().toISOString().split('T')[0]
    dateDebut = `${today}T${startTimeStr}:00`
    dateFin = `${today}T${endTimeStr}:00`
  }

  return {
    id: res.id,
    salle_id: res.salle_id,
    date_debut: dateDebut,
    date_fin: dateFin,
    nom,
    prenom,
    email: res.email || '',
    telephone: res.phone || '',
    nom_association: res.reason || null,
    status: res.status || 'en_attente',
    created_at: res.created_at,
    updated_at: res.updated_at,
    salles: {
      id: salleInfo.id,
      nom: salleInfo.nom,
      adresse: salleInfo.adresse,
      commune_id: salleInfo.commune_id,
    },
  }
}

export default eventHandler(async (event) => {
  await requireAuth(event)

  try {
    const profile = await getCurrentUserProfile(event)
    const query = getQuery(event)
    const salleId = query.salle_id as string | undefined
    const dateDebut = query.date_debut as string | undefined
    const dateFin = query.date_fin as string | undefined
    const queryCommuneId = query.commune_id as string | undefined
    const communeId = getEffectiveCommuneIdForRequest(profile, queryCommuneId)

    if (profile?.role === 'utilisateur' && !communeId) {
      return []
    }

    const db = getAdminFirestore()
    let salleIds: string[] | undefined
    if (communeId) {
      const salaSnap = await db
        .collection('salle')
        .where('commune_id', '==', communeId)
        .get()
      salleIds = salaSnap.docs.map((d) => d.id)
      if (salleIds.length === 0) return []
    }

    const resDocs: QueryDocumentSnapshot[] = []
    if (salleIds && salleIds.length > 0) {
      for (const ch of chunkArray(salleIds, 30)) {
        const snap = await db
          .collection('reservation_salle')
          .where('salle_id', 'in', ch)
          .get()
        resDocs.push(...snap.docs)
      }
    } else {
      const snap = await db.collection('reservation_salle').get()
      resDocs.push(...snap.docs)
    }

    let reservationsData = resDocs.map((d) =>
      serializeFirestoreData({ id: d.id, ...d.data() }),
    ) as Record<string, unknown>[]

    if (salleId) {
      reservationsData = reservationsData.filter((r) => r.salle_id === salleId)
    }

    if (dateDebut) {
      const d0 = new Date(dateDebut).toISOString().split('T')[0]
      reservationsData = reservationsData.filter((r) => {
        const d = r.date as string
        if (!d) return false
        const day = d.includes('T') ? d.split('T')[0]! : d
        return day >= d0!
      })
    }
    if (dateFin) {
      const d1 = new Date(dateFin).toISOString().split('T')[0]
      reservationsData = reservationsData.filter((r) => {
        const d = r.date as string
        if (!d) return false
        const day = d.includes('T') ? d.split('T')[0]! : d
        return day <= d1!
      })
    }

    const uniqueSalleIds = [
      ...new Set(
        reservationsData.map((r) => r.salle_id as string).filter(Boolean),
      ),
    ]
    const salleMap = new Map<string, Record<string, unknown>>()
    for (const sid of uniqueSalleIds) {
      const s = await db.collection('salle').doc(sid).get()
      if (s.exists) {
        const row = docWithId(s.id, s.data())
        if (row) salleMap.set(sid, row)
      }
    }

    const convertedReservations = reservationsData
      .map((res) =>
        mapReservationRow(res, salleMap.get(res.salle_id as string)!),
      )
      .filter((x) => x !== null)

    convertedReservations.sort((a: any, b: any) => {
      const dateA = new Date(a.date_debut).getTime()
      const dateB = new Date(b.date_debut).getTime()
      return dateA - dateB
    })

    return convertedReservations
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred while fetching reservations',
    })
  }
})
