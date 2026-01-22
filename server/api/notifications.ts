import { requireAuth } from '../utils/supabase-auth'

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  // Récupérer les notifications non lues en premier, puis les autres
  const { data: notifications, error } = await supabase
    .from('backoffice_notifications')
    .select('*')
    .order('is_read', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(50) // Limiter à 50 notifications les plus récentes

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Error fetching notifications: ${error.message}`
    })
  }

  // Transformer les notifications pour correspondre au format attendu par le composant
  const formattedNotifications = (notifications || []).map((notif) => {
    // Déterminer le nom de l'expéditeur et l'icône selon le type
    let senderName = 'Système'
    let icon = 'i-lucide-bell'

    if (notif.type === 'signalement') {
      senderName = 'Signalement'
      icon = 'i-lucide-alert-circle'
    } else if (notif.type === 'reservation') {
      senderName = 'Réservation'
      icon = 'i-lucide-calendar'
    }

    return {
      id: notif.id,
      unread: !notif.is_read,
      sender: {
        name: senderName,
        avatar: {
          icon: icon
        }
      },
      body: notif.message,
      date: notif.created_at,
      type: notif.type,
      entity_id: notif.entity_id,
      title: notif.title
    }
  })

  return formattedNotifications
})
