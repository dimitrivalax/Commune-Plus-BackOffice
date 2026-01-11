import { requireAuth } from '../../utils/supabase-auth'

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase, user } = await requireAuth(event)

  try {
    // Récupérer l'utilisateur depuis la table utilisateur
    const { data: utilisateurData, error: utilisateurError } = await supabase
      .from('utilisateur')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (utilisateurError || !utilisateurData) {
      throw createError({
        statusCode: 404,
        message: 'Utilisateur non trouvé'
      })
    }

    // Récupérer les associations utilisateur_commune
    const { data: associationsData, error: associationsError } = await supabase
      .from('utilisateur_commune')
      .select('commune_id')
      .eq('utilisateur_id', utilisateurData.id)

    if (associationsError) {
      throw createError({
        statusCode: 500,
        message: `Error fetching associations: ${associationsError.message}`
      })
    }

    if (!associationsData || associationsData.length === 0) {
      return []
    }

    // Récupérer les communes associées
    const communeIds = associationsData.map((a: any) => a.commune_id)

    const { data: communesData, error: communesError } = await supabase
      .from('commune')
      .select('id, name, postal_code, email, created_at, updated_at')
      .in('id', communeIds)
      .order('name', { ascending: true })

    if (communesError) {
      throw createError({
        statusCode: 500,
        message: `Error fetching communes: ${communesError.message}`
      })
    }

    return (communesData || [])
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while fetching user communes'
    })
  }
})
