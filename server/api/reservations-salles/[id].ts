import { FieldValue } from 'firebase-admin/firestore'
import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { serializeFirestoreData } from '../../utils/firestore-serialize'
import { sendReservationNotification } from '../../utils/send-reservation-notification'

export default eventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  const method = getMethod(event)
  const db = getAdminFirestore()

  try {
    if (method === 'PUT') {
      const body = await readBody(event)
      if (
        !body.date_debut
        || !body.date_fin
        || !body.nom
        || !body.prenom
        || !body.email
        || !body.telephone
      ) {
        throw createError({
          statusCode: 400,
          message:
            'Missing required fields: date_debut, date_fin, nom, prenom, email, telephone'
        })
      }

      const validStatuses = ['en_attente', 'confirmée', 'refusée']
      if (body.status && !validStatuses.includes(body.status)) {
        throw createError({
          statusCode: 400,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        })
      }

      const dateDebut = new Date(body.date_debut)
      const dateFin = new Date(body.date_fin)
      if (dateFin <= dateDebut) {
        throw createError({
          statusCode: 400,
          message: 'date_fin must be after date_debut'
        })
      }

      const ref = db.collection('reservation_salle').doc(id!)
      const existingSnap = await ref.get()
      if (!existingSnap.exists) {
        throw createError({ statusCode: 404, message: 'Reservation not found' })
      }
      const existingReservation = existingSnap.data()!

      const salleIdToUse = body.salle_id || existingReservation.salle_id
      if (!salleIdToUse) {
        throw createError({ statusCode: 400, message: 'salle_id is required' })
      }

      const salleSnap = await db.collection('salle').doc(salleIdToUse).get()
      if (!salleSnap.exists) {
        throw createError({ statusCode: 404, message: 'Salle not found' })
      }
      const salleData = salleSnap.data()!

      const dateDebutDate = new Date(body.date_debut)
      const dateFinDate = new Date(body.date_fin)
      const date = dateDebutDate.toISOString().split('T')[0]!
      const startTime = dateDebutDate.toTimeString().substring(0, 5)
      const endTime = dateFinDate.toTimeString().substring(0, 5)

      const othersSnap = await db
        .collection('reservation_salle')
        .where('salle_id', '==', salleIdToUse)
        .where('date', '==', date)
        .get()

      const overlappingReservations = othersSnap.docs.filter((doc) => {
        if (doc.id === id) return false
        const res = doc.data()
        const resStart = String(res.start_time || '00:00').substring(0, 5)
        const resEnd = String(res.end_time || '23:59').substring(0, 5)
        return resStart < endTime && resEnd > startTime
      })

      if (overlappingReservations.length > 0) {
        throw createError({
          statusCode: 409,
          message: 'Une réservation existe déjà pour cette salle à cet horaire'
        })
      }

      const name = `${body.prenom} ${body.nom}`.trim()
      const updateData: Record<string, unknown> = {
        salle_id: salleIdToUse,
        date,
        start_time: startTime,
        end_time: endTime,
        reason: body.nom_association || null,
        name,
        email: body.email,
        phone: body.telephone,
        updated_at: FieldValue.serverTimestamp()
      }
      if (body.status) updateData.status = body.status

      await ref.update(updateData)
      const dataSnap = await ref.get()
      const data = serializeFirestoreData({
        id: dataSnap.id,
        ...dataSnap.data()
      }) as Record<string, unknown>

      if (
        body.status
        && body.status !== existingReservation.status
        && (body.status === 'confirmée' || body.status === 'refusée')
      ) {
        const displayDate = new Date(date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
        void sendReservationNotification({
          reservationId: String(data.id),
          userEmail: String(data.email),
          communeId: (salleData.commune_id as string | undefined) ?? null,
          userName: String(data.name),
          salleName: String(salleData.nom),
          date: displayDate,
          startTime,
          endTime,
          status: data.status as 'confirmée' | 'refusée'
        }).catch(err => console.error('reservation notification:', err))
      }

      return {
        id: data.id,
        salle_id: salleIdToUse,
        date_debut: body.date_debut,
        date_fin: body.date_fin,
        nom: body.nom,
        prenom: body.prenom,
        email: body.email,
        telephone: body.telephone,
        nom_association: body.nom_association || null,
        status: data.status || 'en_attente',
        created_at: data.created_at,
        updated_at: data.updated_at,
        salles: {
          id: salleIdToUse,
          nom: salleData.nom,
          adresse: salleData.adresse
        }
      }
    }

    if (method === 'DELETE') {
      await db.collection('reservation_salle').doc(id!).delete()
      return { success: true }
    }

    throw createError({ statusCode: 405, message: 'Method not allowed' })
  } catch (error: unknown) {
    const e = error as { statusCode?: number, message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred'
    })
  }
})
