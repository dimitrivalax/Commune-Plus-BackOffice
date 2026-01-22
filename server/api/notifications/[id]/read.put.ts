import { requireAuth } from '../../../utils/supabase-auth'

/**
 * API endpoint pour marquer une notification comme lue
 */
export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Notification ID is required'
    })
  }

  // Marquer la notification comme lue
  const { data, error } = await supabase
    .from('backoffice_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Error updating notification: ${error.message}`
    })
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      message: 'Notification not found'
    })
  }

  return { success: true, notification: data }
})
