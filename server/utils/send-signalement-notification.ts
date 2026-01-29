import { getFCMAccessToken, getFCMProjectId } from './fcm-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

interface SendSignalementNotificationOptions {
  supabase: SupabaseClient
  signalementId: string
  userId: string | null
  title: string
  body: string
  type: 'status_change' | 'response_added'
  newStatus?: string
}

/**
 * Envoie une notification push à l'utilisateur qui a créé le signalement
 */
export async function sendSignalementNotification(options: SendSignalementNotificationOptions): Promise<{
  success: boolean
  tokens_sent: number
  errors?: string[]
}> {
  const { supabase, signalementId, userId, title, body, type, newStatus } = options

  // Si pas d'user_id, on ne peut pas envoyer de notification
  if (!userId) {
    console.log('No user_id found for signalement, skipping notification')
    return {
      success: false,
      tokens_sent: 0,
      errors: ['No user_id found for signalement']
    }
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
        tokens_sent: 0,
        errors: ['FCM not configured']
      }
    }

    // Récupérer tous les tokens de push actifs pour cet utilisateur
    const { data: pushTokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError)
      return {
        success: false,
        tokens_sent: 0,
        errors: [`Error fetching push tokens: ${tokensError.message}`]
      }
    }

    if (!pushTokens || pushTokens.length === 0) {
      console.log('No active push tokens found for user:', userId)
      return {
        success: true,
        tokens_sent: 0
      }
    }

    // Séparer les tokens par plateforme
    const androidTokens = pushTokens
      .filter(t => t.platform === 'android')
      .map(t => t.token)

    const iosTokens = pushTokens
      .filter(t => t.platform === 'ios')
      .map(t => t.token)

    const allTokens = [...androidTokens, ...iosTokens]
    let sentCount = 0
    const errors: string[] = []

    // Envoyer la notification à chaque token
    for (const token of allTokens) {
      try {
        const platform = androidTokens.includes(token) ? 'android' : 'ios'

        // Construire le message selon la plateforme
        const message: any = {
          message: {
            token: token,
            notification: {
              title: title,
              body: body
            },
            // Les données doivent être des strings pour Android
            data: {
              type: 'signalement',
              signalement_id: String(signalementId),
              notification_type: type
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                icon: 'ic_notification',
                channel_id: 'default',
                tag: `signalement_${signalementId}`
              }
            }
          }
        }

        // Ajouter le nouveau statut si disponible
        if (newStatus) {
          message.message.data.status = String(newStatus)
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
                  title: title,
                  body: body
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
      tokens_sent: sentCount,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    console.error('Error in sendSignalementNotification:', error)
    return {
      success: false,
      tokens_sent: 0,
      errors: [error.message || 'Unknown error']
    }
  }
}
