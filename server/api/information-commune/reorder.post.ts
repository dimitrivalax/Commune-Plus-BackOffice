import { FieldValue } from 'firebase-admin/firestore'
import { getCurrentUserProfile, requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'

type ReorderDirection = 'up' | 'down'

export default eventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody(event) as {
    id?: string
    commune_id?: string
    direction?: ReorderDirection
  }

  const id = body.id
  const communeId = body.commune_id
  const direction = body.direction

  if (!id || !communeId || !direction) {
    throw createError({ statusCode: 400, message: 'id, commune_id and direction are required' })
  }

  const profile = await getCurrentUserProfile(event)
  if (
    profile?.role === 'utilisateur'
    && !profile.communeIds.includes(communeId)
  ) {
    throw createError({ statusCode: 403, message: 'Accès refusé' })
  }

  const db = getAdminFirestore()
  const snap = await db
    .collection('information_commune')
    .where('commune_id', '==', communeId)
    .get()

  const rows = snap.docs
    .map(d => ({
      id: d.id,
      ordre_affichage: Number(d.get('ordre_affichage') ?? 0)
    }))
    .sort((a, b) => a.ordre_affichage - b.ordre_affichage)

  const currentIndex = rows.findIndex(r => r.id === id)
  if (currentIndex === -1) {
    throw createError({ statusCode: 404, message: 'Information non trouvée' })
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (targetIndex < 0 || targetIndex >= rows.length) {
    return { success: true, moved: false }
  }

  const current = rows[currentIndex]!
  const target = rows[targetIndex]!

  const batch = db.batch()
  batch.update(db.collection('information_commune').doc(current.id), {
    ordre_affichage: target.ordre_affichage,
    updated_at: FieldValue.serverTimestamp()
  })
  batch.update(db.collection('information_commune').doc(target.id), {
    ordre_affichage: current.ordre_affichage,
    updated_at: FieldValue.serverTimestamp()
  })
  await batch.commit()

  return { success: true, moved: true }
})
