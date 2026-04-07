import {
  requireAuth,
  getCurrentUserProfile,
  getEffectiveCommuneIdForRequest,
} from '../utils/firebase-auth'
import { getAdminFirestore } from '../utils/firebase-admin-app'
import { docWithId } from '../utils/firestore-serialize'

export default eventHandler(async (event) => {
  await requireAuth(event)

  try {
    const profile = await getCurrentUserProfile(event)
    const query = getQuery(event)
    const queryCommuneId = query.commune_id as string | undefined
    const category = query.category as string | undefined
    const isAdminNotifications
      = profile?.role === 'administrateur'
        && category === 'Information Générale'
    const communeId = isAdminNotifications
      ? undefined
      : getEffectiveCommuneIdForRequest(profile, queryCommuneId)

    const db = getAdminFirestore()
    const snap = await db
      .collection('actualite')
      .orderBy('created_at', 'desc')
      .limit(400)
      .get()

    let rows = snap.docs
      .map((d) => docWithId(d.id, d.data()))
      .filter(Boolean) as Record<string, unknown>[]

    if (category) {
      rows = rows.filter((r) => r.category === category)
    }
    if (communeId) {
      rows = rows.filter((r) => r.commune_id === communeId)
    } else if (profile?.role === 'utilisateur' && !isAdminNotifications) {
      return []
    }

    return rows
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred while fetching municipal info',
    })
  }
})
