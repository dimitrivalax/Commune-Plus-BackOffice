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
        .from('municipal_info')
        .update({
          title: body.title,
          content: body.content,
          ...(body.event_date !== undefined && { event_date: body.event_date }),
          category: body.category || null,
          image_url: body.image_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error updating municipal info: ${error.message}`
        })
      }

      return data
    } else if (method === 'DELETE') {
      const { error } = await supabase
        .from('municipal_info')
        .delete()
        .eq('id', id)

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error deleting municipal info: ${error.message}`
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
