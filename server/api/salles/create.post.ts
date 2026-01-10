import { requireAuth } from '../../utils/supabase-auth'

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  try {
    const body = await readBody(event)
    const { data, error } = await supabase
      .from('salles')
      .insert({
        nom: body.nom,
        adresse: body.adresse,
        nombre_max_places: body.nombre_max_places,
        description: body.description || null,
        photo_url: body.photo_url || null
      })
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Error creating salle: ${error.message}`
      })
    }

    return data
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while creating salle'
    })
  }
})
