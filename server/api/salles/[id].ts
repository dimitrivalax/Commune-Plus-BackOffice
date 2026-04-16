import { FieldValue } from 'firebase-admin/firestore'
import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { docWithId } from '../../utils/firestore-serialize'

export default eventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  const method = getMethod(event)
  const db = getAdminFirestore()
  const ref = db.collection('salle').doc(id!)

  try {
    if (method === 'PUT') {
      const body = await readBody(event)
      await ref.update({
        nom: body.nom,
        adresse: body.adresse,
        nombre_max_places: body.nombre_max_places,
        description: body.description || null,
        photo_url: body.photo_url || null,
        updated_at: FieldValue.serverTimestamp()
      })
      const snap = await ref.get()
      return docWithId(snap.id, snap.data())
    }

    if (method === 'DELETE') {
      await ref.delete()
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
