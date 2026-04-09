import { randomUUID } from 'node:crypto'
import { requireAuth, getCurrentUserProfile } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { docWithId } from '../../utils/firestore-serialize'
import { FieldValue } from 'firebase-admin/firestore'

export default eventHandler(async (event) => {
  await requireAuth(event)

  try {
    const body = await readBody(event)
    const profile = await getCurrentUserProfile(event)
    const db = getAdminFirestore()

    const bodyCommuneId = body.commune_id as string | undefined
    let communeId: string | null = bodyCommuneId || null

    if (profile?.role === 'utilisateur') {
      communeId = profile.communeIds[0] ?? null
    }

    if (!communeId) {
      throw createError({
        statusCode: 400,
        message: 'commune_id is required'
      })
    }

    const id = randomUUID()
    const ref = db.collection('information_commune').doc(id)
    const existingSnap = await db
      .collection('information_commune')
      .where('commune_id', '==', communeId)
      .get()
    const maxOrder = existingSnap.docs.reduce((max, d) => {
      const current = Number(d.get('ordre_affichage') ?? 1)
      return Math.max(max, current)
    }, 0)
    const ordreAffichage = maxOrder + 1

    await ref.set({
      title: body.title,
      description: body.description,
      photo_url: body.photo_url || null,
      ordre_affichage: ordreAffichage,
      published: Boolean(body.published ?? false),
      commune_id: communeId,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    })
    const snap = await ref.get()
    return docWithId(snap.id, snap.data())
  } catch (error: unknown) {
    const e = error as { statusCode?: number, message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred while creating information commune'
    })
  }
})
