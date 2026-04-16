import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'

const BATCH_LIMIT = 500

export default eventHandler(async (event) => {
  await requireAuth(event)
  const db = getAdminFirestore()
  const snap = await db
    .collection('backoffice_notification')
    .limit(BATCH_LIMIT)
    .get()

  if (snap.empty) {
    return { success: true, deleted: 0 }
  }

  const batch = db.batch()
  for (const doc of snap.docs) {
    batch.delete(doc.ref)
  }
  await batch.commit()

  return { success: true, deleted: snap.size }
})
