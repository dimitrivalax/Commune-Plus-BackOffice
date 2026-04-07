import {
  requireAuth,
  getCurrentUserProfile,
} from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { chunkArray, docWithId } from '../../utils/firestore-serialize'
import { FieldPath } from 'firebase-admin/firestore'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await getCurrentUserProfile(event)

  if (!profile) {
    throw createError({
      statusCode: 404,
      message: 'Utilisateur non trouvé',
    })
  }

  try {
    const db = getAdminFirestore()

    if (profile.role === 'administrateur') {
      const snap = await db.collection('commune').orderBy('name').get()
      return snap.docs
        .map((d) => docWithId(d.id, d.data()))
        .filter(Boolean)
    }

    if (profile.communeIds.length === 0) {
      return []
    }

    const all: Record<string, unknown>[] = []
    for (const ch of chunkArray(profile.communeIds, 30)) {
      const snap = await db
        .collection('commune')
        .where(FieldPath.documentId(), 'in', ch)
        .get()
      for (const d of snap.docs) {
        const row = docWithId(d.id, d.data())
        if (row) all.push(row)
      }
    }
    all.sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'fr'))
    return all
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message:
        e.message || 'An error occurred while fetching user communes',
    })
  }
})
