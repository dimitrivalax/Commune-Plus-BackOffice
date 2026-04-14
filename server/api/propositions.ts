import {
  requireAuth,
  getCurrentUserProfile,
  getEffectiveCommuneIdForRequest,
  assertCanManageCommune,
} from '../utils/firebase-auth'
import { getAdminFirestore } from '../utils/firebase-admin-app'
import { docWithId } from '../utils/firestore-serialize'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { sendNewPropositionNotification } from '../utils/send-new-proposition-notification'

const createPropositionSchema = z.object({
  commune_id: z.string().min(1),
  name: z.string().min(3),
  description: z.string().min(10),
  photo_url: z.string().nullable().optional(),
  comments_public: z.boolean().optional(),
})

export default eventHandler(async (event) => {
  await requireAuth(event)

  try {
    const profile = await getCurrentUserProfile(event)
    if (!profile) {
      throw createError({ statusCode: 404, message: 'Profil utilisateur non trouvé' })
    }
    const db = getAdminFirestore()

    if (event.method === 'POST') {
      const body = await readBody(event)
      const payload = createPropositionSchema.parse(body)
      assertCanManageCommune(profile, payload.commune_id)
      const ref = db.collection('proposition').doc()
      await ref.set({
        commune_id: payload.commune_id,
        user_id: profile.utilisateurId,
        name: payload.name.trim(),
        description: payload.description.trim(),
        photo_url: payload.photo_url ?? null,
        comments_public: payload.comments_public ?? true,
        user_firstname: 'Mairie',
        user_lastname: '',
        user_email: 'mairie@commune',
        votes_count: 0,
        is_archived: false,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      })
      const created = await ref.get()
      void sendNewPropositionNotification({
        propositionId: ref.id,
        communeId: payload.commune_id,
        propositionName: payload.name.trim(),
      })
      return docWithId(created.id, created.data())
    }

    const query = getQuery(event)
    const queryCommuneId = query.commune_id as string | undefined
    const communeId = getEffectiveCommuneIdForRequest(profile, queryCommuneId)

    let snap
    if (communeId) {
      snap = await db
        .collection('proposition')
        .where('commune_id', '==', communeId)
        .orderBy('updated_at', 'desc')
        .get()
    } else if (profile?.role === 'utilisateur') {
      return []
    } else {
      snap = await db
        .collection('proposition')
        .orderBy('updated_at', 'desc')
        .get()
    }

    return snap.docs.map((d) => docWithId(d.id, d.data())).filter(Boolean)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: `Validation error: ${error.issues.map((x) => x.message).join(', ')}`,
      })
    }
    const e = error as { statusCode?: number; message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred while fetching propositions',
    })
  }
})
