import { FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'node:crypto'
import {
  requireAuth,
  requireCurrentUserProfile,
  assertCanManageCommune,
} from '../../../utils/firebase-auth'
import { getAdminFirestore } from '../../../utils/firebase-admin-app'
import { docWithId } from '../../../utils/firestore-serialize'
import { z } from 'zod'

const bodySchema = z.object({
  content: z.string().min(1, 'Le commentaire ne peut pas être vide'),
})

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Proposition ID is required',
    })
  }

  const body = await readBody(event)
  const { content } = bodySchema.parse(body)
  const db = getAdminFirestore()

  const pref = db.collection('proposition').doc(id)
  const psnap = await pref.get()
  if (!psnap.exists) {
    throw createError({ statusCode: 404, message: 'Proposition not found' })
  }
  const communeId = psnap.get('commune_id') as string
  assertCanManageCommune(profile, communeId)
  const csnap = await db.collection('commune').doc(communeId).get()
  const communeName = csnap.exists ? String(csnap.get('name') || '') : ''
  if (!communeName) {
    throw createError({ statusCode: 500, message: 'Commune not found' })
  }

  const cref = db.collection('proposition_comment').doc(randomUUID())
  await cref.set({
    proposition_id: id,
    user_firstname: 'Mairie',
    user_lastname: communeName,
    user_email: 'mairie@commune',
    author_type: 'commune',
    content: content.trim(),
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  })
  const created = await cref.get()
  return docWithId(created.id, created.data())
})
