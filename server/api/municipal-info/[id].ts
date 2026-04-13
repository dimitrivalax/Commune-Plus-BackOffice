import { FieldValue } from 'firebase-admin/firestore'
import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { docWithId } from '../../utils/firestore-serialize'

export default eventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  const method = getMethod(event)
  const db = getAdminFirestore()
  const ref = db.collection('actualite').doc(id!)

  try {
    if (method === 'PUT') {
      const body = await readBody(event)
      const hasScheduledField = body.scheduled_publish_at !== undefined
      const scheduledPublishAt = typeof body.scheduled_publish_at === 'string' && body.scheduled_publish_at
        ? body.scheduled_publish_at
        : null
      const patch: Record<string, unknown> = {
        title: body.title,
        content: body.content,
        category: body.category || null,
        image_url: body.image_url || null,
        updated_at: FieldValue.serverTimestamp(),
      }
      if (body.event_date !== undefined) {
        patch.event_date = body.event_date
      }
      if (hasScheduledField) {
        if (scheduledPublishAt) {
          patch.scheduled_publish_at = scheduledPublishAt
          patch.publication_status = 'scheduled'
          patch.published_at = null
          patch.notification_sent_at = null
        } else {
          patch.scheduled_publish_at = null
          patch.publication_status = 'published'
          patch.published_at = new Date().toISOString()
        }
      }
      await ref.update(patch)
      const snap = await ref.get()
      return docWithId(snap.id, snap.data())
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
