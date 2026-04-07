import { FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'node:crypto'
import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { serializeFirestoreData } from '../../utils/firestore-serialize'
import { sendReservationConfirmationEmail } from '../../utils/resend-transactional'

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

    const dateDebutDate = new Date(body.date_debut)
    const dateFinDate = new Date(body.date_fin)
    const date = dateDebutDate.toISOString().split('T')[0]
    const startTime = dateDebutDate.toTimeString().substring(0, 5)
    const endTime = dateFinDate.toTimeString().substring(0, 5)

    const allSnap = await db
      .collection('reservation_salle')
      .where('salle_id', '==', body.salle_id)
      .where('date', '==', date)
      .get()

    const overlappingReservations = allSnap.docs.filter((doc) => {
      const res = doc.data()
      const resStart = String(res.start_time || '00:00').substring(0, 5)
      const resEnd = String(res.end_time || '23:59').substring(0, 5)
      return resStart < endTime && resEnd > startTime
    })

    if (overlappingReservations.length > 0) {
      throw createError({
        statusCode: 409,
        message: 'Une réservation existe déjà pour cette salle à cet horaire',
      })
    }

    const name = `${body.prenom} ${body.nom}`.trim()
    const id = randomUUID()
    const ref = db.collection('reservation_salle').doc(id)
    await ref.set({
      salle_id: body.salle_id,
      date,
      start_time: startTime,
      end_time: endTime,
      reason: body.nom_association || null,
      name,
      email: body.email,
      phone: body.telephone,
      status: body.status || 'en_attente',
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
        email: body.email,
        nom: body.nom,
        prenom: body.prenom,
        telephone: body.telephone,
        nom_association: body.nom_association || null,
        date_debut: body.date_debut,
        date_fin: body.date_fin,
        salle_nom: salleData.nom as string,
        salle_adresse: (salleData.adresse as string) || null,
      })
    } catch (emailError: unknown) {
      console.error('Error sending confirmation email:', emailError)
    }

    return {
      id: data.id,
      salle_id: body.salle_id,
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
        id: body.salle_id,
        nom: salleData.nom,
        adresse: salleData.adresse,
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
