import {
  requireAuth,
  requireCurrentUserProfile,
  assertCanManageCommune,
} from '../../../../utils/firebase-auth'
import { getAdminFirestore } from '../../../../utils/firebase-admin-app'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)
  const id = getRouterParam(event, 'id')
  const commentId = getRouterParam(event, 'commentId')
  if (!id || !commentId) {
    throw createError({ statusCode: 400, message: 'IDs requis' })
  }

  const db = getAdminFirestore()
  const pref = db.collection('proposition').doc(id)
  const psnap = await pref.get()
  if (!psnap.exists) {
    throw createError({ statusCode: 404, message: 'Proposition not found' })
  }
  assertCanManageCommune(profile, psnap.get('commune_id') as string | undefined)

  const cref = db.collection('proposition_comment').doc(commentId)
  const csnap = await cref.get()
  if (!csnap.exists || csnap.get('proposition_id') !== id) {
    throw createError({ statusCode: 404, message: 'Comment not found' })
  }
  await cref.delete()
  return { success: true }
})
