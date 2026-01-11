import { requireAuth } from '../utils/supabase-auth'

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  try {
    const query = getQuery(event)
    const communeId = query.commune_id as string | undefined

    let queryBuilder = supabase
      .from('salles')
      .select('*')
      .order('created_at', { ascending: false })

    // Filtrer par commune si fournie
    if (communeId) {
      queryBuilder = queryBuilder.eq('commune_id', communeId)
    }

    const { data, error } = await queryBuilder

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
