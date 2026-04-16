import { FieldValue } from 'firebase-admin/firestore'
import { requireAuth } from '../../utils/firebase-auth'
import { getAdminFirestore } from '../../utils/firebase-admin-app'
import { docWithId } from '../../utils/firestore-serialize'
import { z } from 'zod'
import { sendSignalementNotification } from '../../utils/send-signalement-notification'

const updateSignalementSchema = z.object({
  status: z.enum(['en_attente', 'en_cours', 'traite', 'archive']).optional(),
  description: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  reponse: z.string().nullable().optional()
})

export default eventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Signalement ID is required'
    })
  }

  const db = getAdminFirestore()

  if (event.method === 'PUT') {
    try {
      const body = await readBody(event)
      const validatedData = updateSignalementSchema.parse(body)

      const ref = db.collection('signalement').doc(id)
      const existingSnap = await ref.get()
      if (!existingSnap.exists) {
        throw createError({
          statusCode: 404,
          message: 'Signalement not found'
        })
      }
      const existingSignalement = existingSnap.data()!

      const oldStatus = existingSignalement.status
      const oldReponse = existingSignalement.reponse || null
      const userId = existingSignalement.user_id

      const updateData: Record<string, unknown> = {
        updated_at: FieldValue.serverTimestamp()
      }
      if (validatedData.status !== undefined) {
        updateData.status = validatedData.status
      }
      if (validatedData.description !== undefined) {
        updateData.description = validatedData.description
      }
      if (validatedData.comment !== undefined) {
        updateData.comment = validatedData.comment
      }
      if (validatedData.reponse !== undefined) {
        updateData.reponse = validatedData.reponse
      }

      await ref.update(updateData)
      const updatedSnap = await ref.get()
      const updatedSignalement = docWithId(updatedSnap.id, updatedSnap.data())
      if (!updatedSignalement) {
        throw createError({ statusCode: 500, message: 'Update failed' })
      }

      const newStatus = updatedSignalement.status as string
      const newReponse = (updatedSignalement.reponse || null) as string | null

      try {
        const statusChanged
          = validatedData.status !== undefined && newStatus !== oldStatus
        const responseAdded
          = validatedData.reponse !== undefined
            && newReponse !== null
            && (oldReponse === null || String(oldReponse).trim() === '')

        if (statusChanged || responseAdded) {
          let notificationTitle = ''
          let notificationBody = ''
          let notificationType: 'status_change' | 'response_added' = 'status_change'

          if (responseAdded) {
            notificationTitle = 'Réponse à votre signalement'
            notificationBody = 'Votre signalement a reçu une réponse de la mairie.'
            notificationType = 'response_added'
          } else if (statusChanged) {
            const statusLabels: Record<string, string> = {
              en_attente: 'En Attente',
              en_cours: 'En Cours',
              traite: 'Traité',
              archive: 'Archivé'
            }
            notificationTitle = 'Mise à jour de votre signalement'
            notificationBody = `Le statut de votre signalement a été mis à jour : ${statusLabels[newStatus] || newStatus}`
            notificationType = 'status_change'
          }

          if (notificationTitle && notificationBody) {
            await sendSignalementNotification({
              signalementId: id,
              userId: userId ?? null,
              communeId: (existingSignalement.commune_id as string | undefined) ?? null,
              title: notificationTitle,
              body: notificationBody,
              type: notificationType,
              newStatus: statusChanged ? newStatus : undefined
            })
          }
        }
      } catch (notificationError: unknown) {
        console.error('Notification signalement:', notificationError)
      }

      return updatedSignalement
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw createError({
          statusCode: 400,
          message: `Validation error: ${error.issues.map(x => x.message).join(', ')}`
        })
      }
      const e = error as { statusCode?: number, message?: string }
      throw createError({
        statusCode: e.statusCode || 500,
        message:
          e.message || 'An error occurred while updating the signalement'
      })
    }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
