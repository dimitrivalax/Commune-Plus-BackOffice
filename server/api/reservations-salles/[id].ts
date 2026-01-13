import { requireAuth } from '../../utils/supabase-auth'

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  try {
    if (method === 'PUT') {
      const body = await readBody(event)

      // Validation des champs requis
      if (!body.date_debut || !body.date_fin || !body.nom || !body.prenom || !body.email || !body.telephone) {
        throw createError({
          statusCode: 400,
          message: 'Missing required fields: date_debut, date_fin, nom, prenom, email, telephone'
        })
      }

      // Vérifier que date_fin > date_debut
      const dateDebut = new Date(body.date_debut)
      const dateFin = new Date(body.date_fin)
      if (dateFin <= dateDebut) {
        throw createError({
          statusCode: 400,
          message: 'date_fin must be after date_debut'
        })
      }

      // Récupérer la réservation existante pour obtenir le salle_id
      const { data: existingReservation, error: fetchError } = await supabase
        .from('reservations_salles')
        .select('salle_id')
        .eq('id', id)
        .single()

      if (fetchError || !existingReservation) {
        throw createError({
          statusCode: 404,
          message: 'Reservation not found'
        })
      }

      // Vérifier qu'il n'y a pas de chevauchement avec d'autres réservations
      // Un chevauchement existe si : (date_debut < date_fin_existante) ET (date_fin > date_debut_existante)
      const dateDebutISO = new Date(body.date_debut).toISOString()
      const dateFinISO = new Date(body.date_fin).toISOString()

      const { data: overlappingReservations, error: checkError } = await supabase
        .from('reservations_salles')
        .select('id')
        .eq('salle_id', existingReservation.salle_id)
        .neq('id', id)
        .lt('date_debut', dateFinISO)
        .gt('date_fin', dateDebutISO)

      if (checkError) {
        throw createError({
          statusCode: 500,
          message: `Error checking for overlapping reservations: ${checkError.message}`
        })
      }

      if (overlappingReservations && overlappingReservations.length > 0) {
        throw createError({
          statusCode: 409,
          message: 'Une réservation existe déjà pour cette salle à cet horaire'
        })
      }

      const { data, error } = await supabase
        .from('reservations_salles')
        .update({
          date_debut: body.date_debut,
          date_fin: body.date_fin,
          nom: body.nom,
          prenom: body.prenom,
          email: body.email,
          telephone: body.telephone,
          nom_association: body.nom_association || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          salles (
            id,
            nom,
            adresse
          )
        `)
        .single()

      if (error) {
        if (error.message.includes('réservation existe déjà')) {
          throw createError({
            statusCode: 409,
            message: 'Une réservation existe déjà pour cette salle à cet horaire'
          })
        }
        throw createError({
          statusCode: 500,
          message: `Error updating reservation: ${error.message}`
        })
      }

      return data
    } else if (method === 'DELETE') {
      const { error } = await supabase
        .from('reservations_salles')
        .delete()
        .eq('id', id)

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error deleting reservation: ${error.message}`
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
