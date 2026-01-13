import { requireAuth } from '../../utils/supabase-auth'
import { z } from 'zod'

const updateSignalementSchema = z.object({
  status: z.enum(['en_attente', 'en_cours', 'traite']).optional(),
  comment: z.string().nullable().optional()
})

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Signalement ID is required'
    })
  }

  if (event.method === 'PUT') {
    try {
      const body = await readBody(event)
      const validatedData = updateSignalementSchema.parse(body)

      const updateData: { status?: string; comment?: string | null; updated_at: string } = {
        updated_at: new Date().toISOString()
      }

      if (validatedData.status !== undefined) {
        updateData.status = validatedData.status
      }

      if (validatedData.comment !== undefined) {
        updateData.comment = validatedData.comment
      }

      // Vérifier d'abord si le signalement existe
      const { data: existingData, error: checkError } = await supabase
        .from('signalements')
        .select('id')
        .eq('id', id)
        .single()

      if (checkError || !existingData) {
        throw createError({
          statusCode: 404,
          message: `Signalement not found: ${checkError?.message || 'No data returned'}`
        })
      }

      // Mettre à jour le signalement
      const { data, error } = await supabase
        .from('signalements')
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error updating signalement: ${error.message}`
        })
      }

      if (!data || data.length === 0) {
        throw createError({
          statusCode: 404,
          message: 'Signalement not found after update'
        })
      }

      if (data.length > 1) {
        throw createError({
          statusCode: 500,
          message: 'Multiple signalements found with the same ID'
        })
      }

      return data[0]
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw createError({
          statusCode: 400,
          message: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
        })
      }
      throw createError({
        statusCode: error.statusCode || 500,
        message: error.message || 'An error occurred while updating the signalement'
      })
    }
  }

  throw createError({
    statusCode: 405,
    message: 'Method not allowed'
  })
})

