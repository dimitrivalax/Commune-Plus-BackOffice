import { requireAuth } from '../utils/supabase-auth'

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  try {
    const { data, error } = await supabase
      .from('salles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Error fetching salles: ${error.message}`
      })
    }

    return (data || [])
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while fetching salles'
    })
  }
})
