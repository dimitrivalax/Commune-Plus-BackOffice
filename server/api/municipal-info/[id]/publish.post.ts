import { requireAuth } from '../../../utils/supabase-auth'
import { getFCMAccessToken, getFCMProjectId } from '../../../utils/fcm-auth'

/**
 * API endpoint pour publier une information municipale et envoyer une push notification
 * à tous les utilisateurs qui ont cette commune en favoris
 *
 * Utilise l'API FCM v1 avec authentification OAuth 2.0
 */
export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { commune_id } = body

  if (!commune_id) {
    throw createError({
      statusCode: 400,
      message: 'commune_id is required'
    })
  }

  try {
    // Vérifier la configuration FCM
    let accessToken: string
    let projectId: string

    try {
      accessToken = await getFCMAccessToken()
      projectId = await getFCMProjectId()
    } catch (error: any) {
      console.warn('FCM not configured:', error.message)
      return {
        success: false,
        message: 'FCM non configuré. Veuillez configurer FCM_SERVICE_ACCOUNT_JSON ou FCM_SERVICE_ACCOUNT_PATH',
        tokens_sent: 0
      }
    }

    // Récupérer l'information municipale
    const { data: info, error: infoError } = await supabase
      .from('municipal_info')
      .select('*')
      .eq('id', id)
      .single()

    if (infoError || !info) {
      throw createError({
        statusCode: 404,
        message: 'Information municipale non trouvée'
      })
    }

    // Récupérer tous les tokens de push actifs pour cette commune
    const { data: pushTokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, platform, user_id')
      .eq('commune_id', commune_id)
      .eq('is_active', true)

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError)
      throw createError({
        statusCode: 500,
        message: `Error fetching push tokens: ${tokensError.message}`
      })
    }

    if (!pushTokens || pushTokens.length === 0) {
      return {
        success: true,
        message: 'Aucun token de push trouvé pour cette commune',
        tokens_sent: 0
      }
    }

    // Préparer le message de notification
    const notificationTitle = info.category
    const notificationBody = info.title

    // Séparer les tokens par plateforme
    const androidTokens = pushTokens
      .filter(t => t.platform === 'android')
      .map(t => t.token)

    const iosTokens = pushTokens
      .filter(t => t.platform === 'ios')
      .map(t => t.token)

    let sentCount = 0
    const errors: string[] = []

    // Utiliser l'API FCM v1 pour envoyer les notifications
    // L'API v1 nécessite d'envoyer une notification par token (pas de batch)
    const allTokens = [...androidTokens, ...iosTokens]

    for (const token of allTokens) {
      try {
        const platform = androidTokens.includes(token) ? 'android' : 'ios'

        // Construire le message selon la plateforme
        // IMPORTANT: Pour Android, toutes les valeurs dans 'data' doivent être des strings
        // Pour que l'app s'ouvre quand elle est fermée, on doit utiliser à la fois 'notification' et 'data'
        const message: any = {
          message: {
            token: token,
            notification: {
              title: notificationTitle,
              body: notificationBody
            },
            // Les données doivent être des strings pour Android
            // Ces données seront disponibles même quand l'app est fermée
            data: {
              type: 'municipal_info',
              info_id: String(info.id),
              commune_id: String(commune_id)
            },
            android: {
              priority: 'high',
              // Pour Android, on doit spécifier le canal de notification
              notification: {
                sound: 'default',
                icon: 'ic_notification',
                channel_id: 'default',
                // Tag pour regrouper les notifications similaires
                tag: `info_${info.id}`
                // Note: click_action n'est plus utilisé dans FCM v1
                // Les données dans 'data' seront automatiquement transmises à l'app
                // Capacitor gère automatiquement l'ouverture de l'app quand elle est fermée
              }
            }
          }
        }

        // Configuration spécifique iOS
        if (platform === 'ios') {
          message.message.apns = {
            headers: {
              'apns-priority': '10'
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                alert: {
                  title: notificationTitle,
                  body: notificationBody
                }
              }
            }
          }
        }

        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
          const errorMessage = errorData.error?.message || `HTTP ${response.status}`

          // Vérifier si le token est invalide
          if (errorMessage.includes('NOT_FOUND')
            || errorMessage.includes('INVALID_ARGUMENT')
            || errorMessage.includes('UNREGISTERED')) {
            // Désactiver le token invalide
            await supabase
              .from('push_tokens')
              .update({ is_active: false })
              .eq('token', token)

            errors.push(`Token ${token.substring(0, 20)}...: ${errorMessage}`)
          } else {
            errors.push(`Token ${token.substring(0, 20)}...: ${errorMessage}`)
          }
        } else {
          sentCount++
        }
      } catch (error: any) {
        console.error(`Error sending notification to token ${token.substring(0, 20)}...:`, error)
        errors.push(`Token ${token.substring(0, 20)}...: ${error.message}`)
      }
    }

    return {
      success: true,
      message: `Notifications envoyées avec succès`,
      tokens_sent: sentCount,
      tokens_found: pushTokens.length,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while publishing'
    })
  }
})
