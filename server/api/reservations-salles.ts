import { requireAuth } from '../utils/supabase-auth'

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  try {
    const query = getQuery(event)
    const salleId = query.salle_id as string | undefined
    const dateDebut = query.date_debut as string | undefined
    const dateFin = query.date_fin as string | undefined

    let queryBuilder = supabase
      .from('reservations_salles')
      .select(`
        *,
        salles (
          id,
          nom,
          adresse
        )
      `)
      .order('date_debut', { ascending: true })

    // Filtrer par salle si fourni
    if (salleId) {
      queryBuilder = queryBuilder.eq('salle_id', salleId)
    }

    // Filtrer par période si fournie
    if (dateDebut) {
      queryBuilder = queryBuilder.gte('date_fin', dateDebut)
    }
    if (dateFin) {
      queryBuilder = queryBuilder.lte('date_debut', dateFin)
    }

    const { data, error } = await queryBuilder

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Error fetching reservations: ${error.message}`
      })
    }

    return (data || [])
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while fetching reservations'
    })
  }
})
