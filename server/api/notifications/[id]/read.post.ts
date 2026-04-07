import { FieldValue } from 'firebase-admin/firestore'
import { requireAuth } from '../../../utils/firebase-auth'
import { getAdminFirestore } from '../../../utils/firebase-admin-app'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const db = getAdminFirestore()
  const ref = db.collection('backoffice_notification').doc(id!)
  const snap = await ref.get()
  if (!snap.exists) {
    throw createError({ statusCode: 404, message: 'Notification introuvable' })
  }
  await ref.update({
    is_read: true,
    read_at: FieldValue.serverTimestamp(),
  })
  return { success: true }
})
