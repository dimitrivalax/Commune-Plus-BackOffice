import { FieldValue } from 'firebase-admin/firestore'
import { getCurrentUserProfile, requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { docWithId } from '../../utils/firestore-serialize'

export default eventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  const method = getMethod(event)
  const db = getAdminFirestore()
  const ref = db.collection('information_commune').doc(id!)

  try {
    const snap = await ref.get()
    if (!snap.exists) {
      throw createError({ statusCode: 404, message: 'Information non trouvée' })
    }

    const current = docWithId(snap.id, snap.data()) as {
      commune_id?: string
    } | null
    const profile = await getCurrentUserProfile(event)
    if (
      profile?.role === 'utilisateur'
      && current?.commune_id
      && !profile.communeIds.includes(current.commune_id)
    ) {
      throw createError({ statusCode: 403, message: 'Accès refusé' })
    }

    if (method === 'PUT') {
      const body = await readBody(event)
      await ref.update({
        title: body.title,
        description: body.description,
        photo_url: body.photo_url || null,
        published: Boolean(body.published ?? false),
        updated_at: FieldValue.serverTimestamp(),
      })
      const updated = await ref.get()
      return docWithId(updated.id, updated.data())
    }

    if (method === 'DELETE') {
      await ref.delete()
      return { success: true }
    }

    throw createError({ statusCode: 405, message: 'Method not allowed' })
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred',
    })
  }
})
