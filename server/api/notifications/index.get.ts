import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { serializeFirestoreData } from '../../utils/firestore-serialize'

const MAX_ITEMS = 50

export default eventHandler(async (event) => {
  await requireAuth(event)
  const db = getAdminFirestore()
  const snap = await db
    .collection('backoffice_notification')
    .orderBy('created_at', 'desc')
    .limit(MAX_ITEMS)
    .get()

  return snap.docs.map((d) =>
    serializeFirestoreData({ id: d.id, ...d.data() }),
  )
})
