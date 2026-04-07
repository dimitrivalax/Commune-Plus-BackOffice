import type { Signalement } from '~/types'
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
    const communeId = getEffectiveCommuneIdForRequest(profile, queryCommuneId)

    const db = getAdminFirestore()
    let snap

    if (communeId) {
      snap = await db
        .collection('signalement')
        .where('city_id', '==', communeId)
        .orderBy('created_at', 'desc')
        .get()
    } else if (profile?.role === 'utilisateur') {
      return [] as Signalement[]
    } else {
      snap = await db
        .collection('signalement')
        .orderBy('created_at', 'desc')
        .get()
    }

    const rows = snap.docs
      .map((d) => docWithId(d.id, d.data()))
      .filter(Boolean)
    return rows as unknown as Signalement[]
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred while fetching signalements',
    })
  }
})
