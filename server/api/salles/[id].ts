import { requireAuth } from '../../utils/supabase-auth'

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  try {
    if (method === 'PUT') {
      const body = await readBody(event)
      const { data, error } = await supabase
        .from('salles')
        .update({
          nom: body.nom,
          adresse: body.adresse,
          nombre_max_places: body.nombre_max_places,
          description: body.description || null,
          photo_url: body.photo_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error updating salle: ${error.message}`
        })
      }

      return data
    } else if (method === 'DELETE') {
      const { error } = await supabase
        .from('salles')
        .delete()
        .eq('id', id)

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error deleting salle: ${error.message}`
        })
      }

      return { success: true }
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
