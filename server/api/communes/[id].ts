import { FieldValue } from 'firebase-admin/firestore'
import {
  requireAuth,
  requireCurrentUserProfile
} from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { docWithId } from '../../utils/firestore-serialize'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  const isGlobalAdmin = profile.role === 'administrateur'
  const isAssociated = profile.communeIds.includes(id || '')

  if (method === 'DELETE') {
    if (!isGlobalAdmin) {
      throw createError({
        statusCode: 403,
        message: 'La suppression est réservée aux administrateurs globaux'
      })
    }
  } else if (method === 'GET' || method === 'PUT') {
    if (!isGlobalAdmin && !isAssociated) {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'avez pas la permission d\'accéder à cette commune'
      })
    }
  }

  const db = getAdminFirestore()
  const ref = db.collection('commune').doc(id!)

  try {
    if (method === 'GET') {
      const snap = await ref.get()
      if (!snap.exists) {
        throw createError({ statusCode: 404, message: 'Commune not found' })
      }
      return docWithId(snap.id, snap.data())
    }

    if (method === 'PUT') {
      const body = await readBody(event)
      await ref.update({
        name: body.name,
        postal_code: body.postal_code,
        email: body.email,
        logo_url: body.logo_url,
        date_licence: body.date_licence ?? null,
        feature_reservations_salles: body.feature_reservations_salles,
        feature_propositions: body.feature_propositions,
        updated_at: FieldValue.serverTimestamp()
      })
      const snap = await ref.get()
      return docWithId(snap.id, snap.data())
    }

    if (method === 'DELETE') {
      await ref.delete()
      return { success: true }
    }

    throw createError({ statusCode: 405, message: 'Method not allowed' })
  } catch (error: unknown) {
    const e = error as { statusCode?: number, message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred'
    })
  }
})
