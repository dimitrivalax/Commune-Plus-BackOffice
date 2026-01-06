import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please check your environment variables.')
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

const updateStatusSchema = z.object({
  status: z.enum(['en_attente', 'en_cours', 'traité'])
})

export default eventHandler(async (event) => {
  if (!supabase) {
    throw createError({
      statusCode: 500,
      message: 'Supabase configuration is missing'
    })
  }

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
      const { status } = updateStatusSchema.parse(body)

      const { data, error } = await supabase
        .from('signalements')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error updating signalement: ${error.message}`
        })
      }

      return data
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

