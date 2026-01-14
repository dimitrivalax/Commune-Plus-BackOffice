import { requireAuth } from '../../utils/supabase-auth'

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  try {
    const body = await readBody(event)

    // Validation des champs requis
    if (!body.salle_id || !body.date_debut || !body.date_fin || !body.nom || !body.prenom || !body.email || !body.telephone) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: salle_id, date_debut, date_fin, nom, prenom, email, telephone'
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

    // Récupérer le nom de la salle depuis salle_id
    const { data: salleData, error: salleError } = await supabase
      .from('salles')
      .select('nom, adresse')
      .eq('id', body.salle_id)
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

    // Vérifier qu'il n'y a pas de chevauchement
    // Un chevauchement existe si : même salle, même date, et les heures se chevauchent
    // Chevauchement: (start_time < endTime_existante) ET (end_time > startTime_existante)
    const { data: allReservations, error: checkError } = await supabase
      .from('reservations_salles')
      .select('id, start_time, end_time')
      .eq('salle_id', body.salle_id)
      .eq('date', date)

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

    // Combiner nom et prenom
    const name = `${body.prenom} ${body.nom}`.trim()

    const { data, error } = await supabase
      .from('reservations_salles')
      .insert({
        salle_id: body.salle_id,
        date: date,
        start_time: startTime,
        end_time: endTime,
        reason: body.nom_association || null,
        name: name,
        email: body.email,
        phone: body.telephone,
        status: body.status || 'en_attente'
      })
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Error creating reservation: ${error.message}`
      })
    }

    // Envoyer l'email de confirmation (ne pas bloquer si l'envoi échoue)
    try {
      await supabase.functions.invoke('send-reservation-confirmation', {
        body: {
          email: body.email,
          nom: body.nom,
          prenom: body.prenom,
          telephone: body.telephone,
          nom_association: body.nom_association || null,
          date_debut: body.date_debut,
          date_fin: body.date_fin,
          salle_nom: salleData.nom,
          salle_adresse: salleData.adresse
        }
      })
    } catch (emailError: any) {
      // Logger l'erreur mais ne pas faire échouer la création de la réservation
      console.error('Error sending confirmation email:', emailError)
    }

    // Retourner au format attendu par le frontend
    return {
      id: data.id,
      salle_id: body.salle_id,
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
      salles: {
        id: body.salle_id,
        nom: salleData.nom,
        adresse: salleData.adresse
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while creating reservation'
    })
  }
})
