import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Identifiant de notification requis' })
  }

  const db = getAdminFirestore()
  const ref = db.collection('backoffice_notification').doc(id)
  const snap = await ref.get()
  if (!snap.exists) {
    throw createError({ statusCode: 404, message: 'Notification introuvable' })
  }

  await ref.delete()
  return { success: true }
})
