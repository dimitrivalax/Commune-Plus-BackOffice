import { FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'node:crypto'
import {
  requireAuth,
  getCurrentUserProfile,
  getEffectiveCommuneIdForRequest,
} from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { docWithId } from '../../utils/firestore-serialize'

export default eventHandler(async (event) => {
  await requireAuth(event)

  try {
    const body = await readBody(event)
    const profile = await getCurrentUserProfile(event)
    const effectiveCommuneId = getEffectiveCommuneIdForRequest(
      profile,
      body.commune_id,
    )

    if (!effectiveCommuneId) {
      throw createError({
        statusCode: 400,
        message: 'commune_id est requis pour créer une salle',
      })
    }

    const db = getAdminFirestore()
    const id = randomUUID()
    const ref = db.collection('salle').doc(id)
    await ref.set({
      nom: body.nom,
      adresse: body.adresse,
      nombre_max_places: body.nombre_max_places,
      description: body.description || null,
      photo_url: body.photo_url || null,
      commune_id: effectiveCommuneId,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    })
    const snap = await ref.get()
    const row = docWithId(snap.id, snap.data())
    if (!row) throw createError({ statusCode: 500, message: 'Erreur création' })
    return row
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred while creating salle',
    })
  }
})
