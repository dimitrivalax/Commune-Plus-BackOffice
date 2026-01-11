import { createClient } from '@supabase/supabase-js'
import type { Signalement } from '~/types'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please check your environment variables.')
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export default eventHandler(async (event) => {
  if (!supabase) {
    throw createError({
      statusCode: 500,
      message: 'Supabase configuration is missing'
    })
  }

  try {
    const query = getQuery(event)
    const communeId = query.commune_id as string | undefined

    let queryBuilder = supabase
      .from('signalements')
      .select('*')
      .order('created_at', { ascending: false })

    // Filtrer par commune si fournie
    if (communeId) {
      queryBuilder = queryBuilder.eq('city_id', communeId)
    }

    const { data, error } = await queryBuilder

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Error fetching signalements: ${error.message}`
      })
    }

    return (data || []) as Signalement[]
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while fetching signalements'
    })
  }
})

