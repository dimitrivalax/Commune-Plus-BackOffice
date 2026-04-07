import { FieldValue } from 'firebase-admin/firestore'
import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { docWithId } from '../../utils/firestore-serialize'
import { z } from 'zod'

const updatePropositionSchema = z.object({
  is_archived: z.boolean().optional(),
})

export default eventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Proposition ID is required',
    })
  }

  const db = getAdminFirestore()

  if (event.method === 'GET') {
    try {
      const ref = db.collection('proposition').doc(id)
      const psnap = await ref.get()
      if (!psnap.exists) {
        throw createError({ statusCode: 404, message: 'Proposition not found' })
      }
      const proposition = docWithId(psnap.id, psnap.data())!

      const csnap = await db
        .collection('proposition_comment')
        .where('proposition_id', '==', id)
        .orderBy('created_at', 'asc')
        .get()
      const comments = csnap.docs
        .map((d) => docWithId(d.id, d.data()))
        .filter(Boolean)

      return {
        ...proposition,
        comments: comments || [],
      }
    } catch (error: unknown) {
      const e = error as { statusCode?: number; message?: string }
      throw createError({
        statusCode: e.statusCode || 500,
        message: e.message || 'Error',
      })
    }
  }

  if (event.method === 'PUT') {
    try {
      const body = await readBody(event)
      const validatedData = updatePropositionSchema.parse(body)
      const pref = db.collection('proposition').doc(id)
      await pref.update({
        ...validatedData,
        updated_at: FieldValue.serverTimestamp(),
      })
      const snap = await pref.get()
      return docWithId(snap.id, snap.data())
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
        message: e.message || 'Error',
      })
    }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
