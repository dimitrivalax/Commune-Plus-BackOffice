import { requireAuth } from '../../utils/supabase-auth'

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  try {
    const body = await readBody(event)
    const { data, error } = await supabase
      .from('municipal_info')
      .insert({
        title: body.title,
        content: body.content,
        category: body.category || null,
        image_url: body.image_url || null
      })
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Error creating municipal info: ${error.message}`
      })
    }

    return data
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while creating municipal info'
    })
  }
})
