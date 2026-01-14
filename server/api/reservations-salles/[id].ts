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

      // Valider le statut si fourni
      const validStatuses = ['en_attente', 'confirmée', 'refusée']
      if (body.status && !validStatuses.includes(body.status)) {
        throw createError({
          statusCode: 400,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
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

      // Récupérer la réservation existante
      const { data: existingReservation, error: fetchError } = await supabase
        .from('reservations_salles')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !existingReservation) {
        throw createError({
          statusCode: 404,
          message: 'Reservation not found'
        })
      }

      // Déterminer le salle_id à utiliser (celui fourni dans le body ou celui existant)
      const salleIdToUse = body.salle_id || existingReservation.salle_id

      if (!salleIdToUse) {
        throw createError({
          statusCode: 400,
          message: 'salle_id is required'
        })
      }

      // Vérifier que la salle existe
      const { data: salleData, error: salleError } = await supabase
        .from('salles')
        .select('id, nom, adresse')
        .eq('id', salleIdToUse)
        .single()

      if (salleError || !salleData) {
        throw createError({
          statusCode: 404,
          message: 'Salle not found'
        })
      }

      // Convertir date_debut et date_fin en date, start_time et end_time
      const dateDebutDate = new Date(body.date_debut)
      const dateFinDate = new Date(body.date_fin)

      const date = dateDebutDate.toISOString().split('T')[0] // YYYY-MM-DD
      const startTime = dateDebutDate.toTimeString().substring(0, 5) // HH:mm
      const endTime = dateFinDate.toTimeString().substring(0, 5) // HH:mm

      // Vérifier qu'il n'y a pas de chevauchement avec d'autres réservations
      const { data: allReservations, error: checkError } = await supabase
        .from('reservations_salles')
        .select('id, start_time, end_time')
        .eq('salle_id', salleIdToUse)
        .eq('date', date)
        .neq('id', id)

      if (checkError) {
        throw createError({
          statusCode: 500,
          message: `Error checking for overlapping reservations: ${checkError.message}`
        })
      }

      const overlappingReservations = (allReservations || []).filter((res: any) => {
        const resStart = res.start_time?.substring(0, 5) || '00:00'
        const resEnd = res.end_time?.substring(0, 5) || '23:59'
        // Chevauchement si: start_time < endTime ET end_time > startTime
        return resStart < endTime && resEnd > startTime
      })

      if (overlappingReservations.length > 0) {
        throw createError({
          statusCode: 409,
          message: 'Une réservation existe déjà pour cette salle à cet horaire'
        })
      }

      // Combiner nom et prenom
      const name = `${body.prenom} ${body.nom}`.trim()

      const updateData: any = {
        salle_id: salleIdToUse,
        date: date,
        start_time: startTime,
        end_time: endTime,
        reason: body.nom_association || null,
        name: name,
        email: body.email,
        phone: body.telephone,
        updated_at: new Date().toISOString()
      }

      // Ajouter le statut si fourni
      if (body.status) {
        updateData.status = body.status
      }

      const { data, error } = await supabase
        .from('reservations_salles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error updating reservation: ${error.message}`
        })
      }

      // Retourner au format attendu par le frontend
      return {
        id: data.id,
        salle_id: salleIdToUse,
        date_debut: body.date_debut,
        date_fin: body.date_fin,
        nom: body.nom,
        prenom: body.prenom,
        email: body.email,
        telephone: body.telephone,
        nom_association: body.nom_association || null,
        status: data.status || 'en_attente',
        created_at: data.created_at,
        updated_at: data.updated_at,
        salles: salleData
      }
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
