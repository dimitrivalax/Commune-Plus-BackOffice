import { FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'node:crypto'
import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { docWithId } from '../../utils/firestore-serialize'

export default eventHandler(async (event) => {
  await requireAuth(event)

  try {
    const body = await readBody(event)
    const db = getAdminFirestore()
    const id = randomUUID()
    const ref = db.collection('actualite').doc(id)
    await ref.set({
      title: body.title,
      content: body.content,
      event_date:
        body.event_date || new Date().toISOString().split('T')[0],
      category: body.category || null,
      image_url: body.image_url || null,
      commune_id: body.commune_id || null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    })
    const snap = await ref.get()
    return docWithId(snap.id, snap.data())
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred while creating municipal info',
    })
  }
})
