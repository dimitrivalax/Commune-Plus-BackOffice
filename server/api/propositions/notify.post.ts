import { z } from 'zod'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { sendPropositionNotification } from '../../utils/send-proposition-notification'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const notifySchema = z.object({
  proposition_id: z.string().uuid(),
  type: z.enum(['vote', 'comment']),
  comment_content: z.string().optional(),
})

export default eventHandler(async (event) => {
  setResponseHeaders(event, corsHeaders)
  const body = await readBody(event)
  const validatedData = notifySchema.parse(body)
  const db = getAdminFirestore()

  const pref = db.collection('proposition').doc(validatedData.proposition_id)
  const psnap = await pref.get()
  if (!psnap.exists) {
    throw createError({ statusCode: 404, message: 'Proposition not found' })
  }
  const pdata = psnap.data() || {};
  const proposition = { id: psnap.id, ...pdata } as Record<string, unknown>;

  let title = ''
  let messageBody = ''
  if (validatedData.type === 'vote') {
    title = 'Nouveau vote !'
    messageBody = `Quelqu'un a voté pour votre proposition : "${String(proposition.name ?? '')}"`
  } else {
    title = 'Nouveau commentaire'
    messageBody = `Quelqu'un a commenté votre proposition : "${String(proposition.name ?? '')}"`
  }

  const result = await sendPropositionNotification({
    propositionId: String(proposition.id),
    userId: (proposition.user_id as string | undefined) ?? null,
    title,
    body: messageBody,
    type: validatedData.type,
  })

  return result
})
