import { requireAuth } from '../../utils/supabase-auth'
import { requireCurrentUserProfile } from '../../utils/supabase-auth'

export default eventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  if (profile.role !== 'administrateur') {
    throw createError({
      statusCode: 403,
      message: 'Accès réservé aux administrateurs'
    })
  }

  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  try {
    if (method === 'GET') {
      // Récupérer la commune
      const { data, error } = await supabase
        .from('commune')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw createError({
          statusCode: 404,
          message: 'Commune not found'
        })
      }

      return data
    } else if (method === 'PUT') {
      const body = await readBody(event)

      // Mettre à jour la commune
      const { data, error } = await supabase
        .from('commune')
        .update({
          name: body.name,
          postal_code: body.postal_code,
          email: body.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error updating commune: ${error.message}`
        })
      }

      return data
    } else if (method === 'DELETE') {
      // Supprimer la commune
      const { data, error } = await supabase
        .from('commune')
        .delete()
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error deleting commune: ${error.message}`
        })
      }

      return { success: true, data }
    } else {
      throw createError({
        statusCode: 405,
        message: 'Method not allowed'
      })
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred'
    })
  }
})
