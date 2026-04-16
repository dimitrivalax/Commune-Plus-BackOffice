import { FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'node:crypto'
import { requireAuth, requireCurrentUserProfile } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { docWithId } from '../../utils/firestore-serialize'

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
    const body = await readBody(event)
    const db = getAdminFirestore()
    const id = randomUUID()
    const ref = db.collection('commune').doc(id)
    await ref.set({
      name: body.name,
      postal_code: body.postal_code,
      email: body.email,
      logo_url: body.logo_url ?? null,
      date_licence: body.date_licence ?? null,
      feature_reservations_salles: body.feature_reservations_salles !== false,
      feature_propositions: body.feature_propositions !== false,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    })
    const created = await ref.get()
    const row = docWithId(created.id, created.data())
    if (!row) {
      throw createError({ statusCode: 500, message: 'Erreur après création' })
    }
    return row
  } catch (error: unknown) {
    const e = error as { statusCode?: number, message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message:
        e.message || 'Une erreur est survenue lors de la création de la commune'
    })
  }
})
