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

    // Vérifier qu'il n'y a pas de chevauchement (la contrainte DB le fera aussi, mais on peut donner un message plus clair)
    // Un chevauchement existe si : (date_debut < date_fin_existante) ET (date_fin > date_debut_existante)
    const dateDebutISO = new Date(body.date_debut).toISOString()
    const dateFinISO = new Date(body.date_fin).toISOString()
    
    const { data: overlappingReservations, error: checkError } = await supabase
      .from('reservations_salles')
      .select('id')
      .eq('salle_id', body.salle_id)
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
      .insert({
        salle_id: body.salle_id,
        date_debut: body.date_debut,
        date_fin: body.date_fin,
        nom: body.nom,
        prenom: body.prenom,
        email: body.email,
        telephone: body.telephone,
        nom_association: body.nom_association || null
      })
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
      // Si l'erreur vient de la contrainte de chevauchement
      if (error.message.includes('réservation existe déjà')) {
        throw createError({
          statusCode: 409,
          message: 'Une réservation existe déjà pour cette salle à cet horaire'
        })
      }
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
          salle_nom: data.salles?.nom || 'Salle municipale',
          salle_adresse: data.salles?.adresse || ''
        }
      })
    } catch (emailError: any) {
      // Logger l'erreur mais ne pas faire échouer la création de la réservation
      console.error('Error sending confirmation email:', emailError)
      // On continue même si l'email n'a pas pu être envoyé
    }

    return data
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while creating reservation'
    })
  }
})
