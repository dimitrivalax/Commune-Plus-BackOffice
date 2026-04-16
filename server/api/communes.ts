import { requireAuth, requireCurrentUserProfile } from '../utils/firebase-auth'
import { getAdminFirestore } from '../utils/firebase-admin-app'
import { docWithId } from '../utils/firestore-serialize'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  if (profile.role !== 'administrateur') {
    throw createError({
      statusCode: 403,
      message: 'Accès réservé aux administrateurs'
    })
  }

  try {
    const db = getAdminFirestore()
    const snap = await db.collection('commune').orderBy('name').get()
    return snap.docs
      .map(d => docWithId(d.id, d.data()))
      .filter(Boolean)
  } catch (error: unknown) {
    const e = error as { statusCode?: number, message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred while fetching communes'
    })
  }
})
