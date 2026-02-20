import { requireAuth } from '../utils/supabase-auth'
import { getCurrentUserProfile, getEffectiveCommuneIdForRequest } from '../utils/supabase-auth'

export default eventHandler(async (event) => {
  const { supabase } = await requireAuth(event)

  try {
    const profile = await getCurrentUserProfile(event)
    const query = getQuery(event)
    const queryCommuneId = query.commune_id as string | undefined
    const category = query.category as string | undefined
    const isAdminNotifications =
      profile?.role === 'administrateur' &&
      category === 'Information Générale'
    const communeId = isAdminNotifications
      ? undefined
      : getEffectiveCommuneIdForRequest(profile, queryCommuneId)

    let queryBuilder = supabase
      .from('municipal_info')
      .select('*')
      .order('created_at', { ascending: false })

    if (category) {
      queryBuilder = queryBuilder.eq('category', category)
    }
    if (communeId) {
      queryBuilder = queryBuilder.eq('commune_id', communeId)
    } else if (profile?.role === 'utilisateur') {
      return []
    }

    const { data, error } = await queryBuilder

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Error fetching municipal info: ${error.message}`
      })
    }

    return (data || [])
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while fetching municipal info'
    })
  }
})
