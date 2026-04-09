import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from '../../utils/firebase-admin-app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const notifySchema = z.object({
  type: z.enum(['signalement', 'reservation']),
  entity_id: z.string().min(1).max(128),
  title: z.string().min(1).max(120).optional(),
  message: z.string().min(1).max(500).optional(),
  requester_name: z.string().max(120).optional(),
})

export default eventHandler(async (event) => {
  setResponseHeaders(event, corsHeaders)
  const body = await readBody(event)
  const payload = notifySchema.parse(body)
  const db = getAdminFirestore()

  const existing = await db
    .collection('backoffice_notification')
    .where('type', '==', payload.type)
    .where('entity_id', '==', payload.entity_id)
    .limit(1)
    .get()

  if (!existing.empty) {
    return { success: true, created: false }
  }

  const fallbackTitle
    = payload.type === 'signalement'
      ? 'Nouveau signalement'
      : 'Nouvelle réservation'
  const fallbackMessage
    = payload.requester_name && payload.requester_name.trim()
      ? `${payload.requester_name.trim()} a envoyé ${
          payload.type === 'signalement' ? 'un signalement' : 'une réservation'
        }`
      : payload.type === 'signalement'
        ? 'Un nouveau signalement a été créé'
        : 'Une nouvelle réservation a été créée'

  await db.collection('backoffice_notification').add({
    type: payload.type,
    entity_id: payload.entity_id,
    title: payload.title || fallbackTitle,
    message: payload.message || fallbackMessage,
    is_read: false,
    created_at: FieldValue.serverTimestamp(),
    read_at: null,
  })

  return { success: true, created: true }
})
