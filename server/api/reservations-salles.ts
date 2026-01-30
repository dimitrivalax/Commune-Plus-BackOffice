import { requireAuth } from '../utils/supabase-auth'
import { getCurrentUserProfile, getEffectiveCommuneIdForRequest } from '../utils/supabase-auth'

export default eventHandler(async (event) => {
  const { supabase } = await requireAuth(event)

  try {
    const profile = await getCurrentUserProfile(event)
    const query = getQuery(event)
    const salleId = query.salle_id as string | undefined
    const dateDebut = query.date_debut as string | undefined
    const dateFin = query.date_fin as string | undefined
    const queryCommuneId = query.commune_id as string | undefined
    const communeId = getEffectiveCommuneIdForRequest(profile, queryCommuneId)

    if (profile?.role === 'utilisateur' && !communeId) {
      return []
    }

    // Si une commune est spécifiée (ou imposée pour un utilisateur), récupérer les IDs des salles
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

    // Récupérer les réservations de la table 'reservations_salles' avec JOIN sur salles
    let queryBuilder = supabase
      .from('reservations_salles')
      .select(`
        *,
        salle:salles(id, nom, adresse, commune_id)
      `)
      .order('date', { ascending: true })

    // Filtrer par salle si fourni (via salle_id)
    if (salleId) {
      queryBuilder = queryBuilder.eq('salle_id', salleId)
    }

    // Filtrer par commune si fournie (via salle_id)
    if (communeId && salleIds && salleIds.length > 0) {
      queryBuilder = queryBuilder.in('salle_id', salleIds)
    }

    // Filtrer par période si fournie
    if (dateDebut) {
      const dateDebutDate = new Date(dateDebut)
      queryBuilder = queryBuilder.gte('date', dateDebutDate.toISOString().split('T')[0])
    }
    if (dateFin) {
      const dateFinDate = new Date(dateFin)
      queryBuilder = queryBuilder.lte('date', dateFinDate.toISOString().split('T')[0])
    }

    const { data: reservationsData, error } = await queryBuilder

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Error fetching reservations: ${error.message}`
      })
    }

    // Convertir les réservations au format attendu par le frontend (compatible avec ReservationSalle)
    const convertedReservations = (reservationsData || []).map((res: any) => {
      // Récupérer les informations de la salle depuis le JOIN
      const salleInfo = res.salle

      if (!salleInfo || !res.salle_id) {
        return null
      }

      // Séparer le nom complet en prénom et nom
      const nameParts = (res.name || '').trim().split(' ')
      const prenom = nameParts[0] || ''
      const nom = nameParts.slice(1).join(' ') || prenom

      // Convertir date + start_time en date_debut (timestamp)
      const dateStr = res.date
      let startTimeStr = res.start_time || '00:00'
      let endTimeStr = res.end_time || '23:59'

      // Normaliser les formats d'heure (extraire HH:mm si format ISO)
      if (startTimeStr.includes('T')) {
        startTimeStr = startTimeStr.split('T')[1]?.substring(0, 5) || '00:00'
      } else if (startTimeStr.length > 5) {
        startTimeStr = startTimeStr.substring(0, 5)
      }

      if (endTimeStr.includes('T')) {
        endTimeStr = endTimeStr.split('T')[1]?.substring(0, 5) || '23:59'
      } else if (endTimeStr.length > 5) {
        endTimeStr = endTimeStr.substring(0, 5)
      }

      // Construire les timestamps ISO
      let dateDebut: string
      let dateFin: string

      if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Format YYYY-MM-DD
        dateDebut = `${dateStr}T${startTimeStr}:00`
        dateFin = `${dateStr}T${endTimeStr}:00`
      } else if (dateStr && dateStr.includes('T')) {
        // Format ISO déjà, extraire juste la date
        const dateOnly = dateStr.split('T')[0]
        dateDebut = `${dateOnly}T${startTimeStr}:00`
        dateFin = `${dateOnly}T${endTimeStr}:00`
      } else {
        // Fallback: utiliser la date actuelle
        const today = new Date().toISOString().split('T')[0]
        dateDebut = `${today}T${startTimeStr}:00`
        dateFin = `${today}T${endTimeStr}:00`
      }

      return {
        id: res.id,
        salle_id: res.salle_id,
        date_debut: dateDebut,
        date_fin: dateFin,
        nom: nom,
        prenom: prenom,
        email: res.email || '',
        telephone: res.phone || '',
        nom_association: res.reason || null,
        status: res.status || 'en_attente',
        created_at: res.created_at,
        updated_at: res.updated_at,
        salles: {
          id: salleInfo.id,
          nom: salleInfo.nom,
          adresse: salleInfo.adresse,
          commune_id: salleInfo.commune_id
        }
      }
    }).filter((res: any) => res !== null)

    // Trier par date_debut
    convertedReservations.sort((a: any, b: any) => {
      const dateA = new Date(a.date_debut).getTime()
      const dateB = new Date(b.date_debut).getTime()
      return dateA - dateB
    })

    return convertedReservations
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while fetching reservations'
    })
  }
})
