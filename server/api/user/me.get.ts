import type { Commune } from '~/types'
import { requireAuth, requireCurrentUserProfile } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { chunkArray, docWithId } from '../../utils/firestore-serialize'
import { FieldPath } from 'firebase-admin/firestore'

export interface CurrentUserMe {
  id: string
  role: 'utilisateur' | 'administrateur'
  communes: Commune[]
}

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  const communes: Commune[] = []
  const db = getAdminFirestore()

  if (profile.communeIds.length > 0) {
    for (const ch of chunkArray(profile.communeIds, 30)) {
      const snap = await db
        .collection('commune')
        .where(FieldPath.documentId(), 'in', ch)
        .get()
      for (const d of snap.docs) {
        const row = docWithId(d.id, d.data())
        if (row) {
          communes.push(row as unknown as Commune)
        }
      }
    }
    communes.sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'fr'))
  }

  const result: CurrentUserMe = {
    id: profile.utilisateurId,
    role: profile.role,
    communes
  }

  return result
})
