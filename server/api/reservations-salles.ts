import { requireAuth } from '../utils/supabase-auth'

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  try {
    const query = getQuery(event)
    const salleId = query.salle_id as string | undefined
    const dateDebut = query.date_debut as string | undefined
    const dateFin = query.date_fin as string | undefined
    const communeId = query.commune_id as string | undefined

    // Si une commune est spécifiée, récupérer d'abord les IDs des salles de cette commune
    let salleIds: string[] | undefined
    if (communeId) {
      const { data: sallesData, error: sallesError } = await supabase
        .from('salles')
        .select('id')
        .eq('commune_id', communeId)

      if (sallesError) {
        throw createError({
          statusCode: 500,
          message: `Error fetching salles: ${sallesError.message}`
        })
      }

      salleIds = sallesData?.map((s: any) => s.id) || []
      // Si aucune salle n'est trouvée pour cette commune, retourner un tableau vide
      if (salleIds.length === 0) {
        return []
      }
    }

    let queryBuilder = supabase
      .from('reservations_salles')
      .select(`
        *,
        salles (
          id,
          nom,
          adresse,
          commune_id
        )
      `)
      .order('date_debut', { ascending: true })

    // Filtrer par salle si fourni
    if (salleId) {
      queryBuilder = queryBuilder.eq('salle_id', salleId)
    }

    // Filtrer par commune si fournie (via les IDs des salles)
    if (communeId && salleIds && salleIds.length > 0) {
      queryBuilder = queryBuilder.in('salle_id', salleIds)
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
