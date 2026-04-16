import { getFCMAccessToken, getFCMProjectId } from './fcm-auth'
import {
  deactivatePushTokenByValue,
  fetchActivePushTokensByUserId
} from './push-tokens-db'
import { capturePosthogEvent } from './posthog-server'

interface SendSignalementNotificationOptions {
  signalementId: string
  userId: string | null
  communeId?: string | null
  title: string
  body: string
  type: 'status_change' | 'response_added'
  newStatus?: string
}

export async function sendSignalementNotification(
  options: SendSignalementNotificationOptions
): Promise<{
  success: boolean
  tokens_sent: number
  errors?: string[]
}> {
  const { signalementId, userId, communeId, title, body, type, newStatus } = options
  const notificationId = `signalement_${signalementId}_${type}_${Date.now()}`

  if (!userId) {
    console.log('No user_id found for signalement, skipping notification')
    return {
      success: false,
      tokens_sent: 0,
      errors: ['No user_id found for signalement']
    }
  }

  try {
    let accessToken: string
    let projectId: string

    try {
      accessToken = await getFCMAccessToken()
      projectId = await getFCMProjectId()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.warn('FCM not configured:', msg)
      return {
        success: false,
        tokens_sent: 0,
        errors: ['FCM not configured']
      }
    }

    const pushTokens = await fetchActivePushTokensByUserId(userId)

    if (!pushTokens || pushTokens.length === 0) {
      return { success: true, tokens_sent: 0 }
    }

    const androidTokens = pushTokens
      .filter(t => t.platform === 'android')
      .map(t => t.token)
    const iosTokens = pushTokens
      .filter(t => t.platform === 'ios')
      .map(t => t.token)
    const allTokens = [...androidTokens, ...iosTokens]
    let sentCount = 0
    const errors: string[] = []

    for (const token of allTokens) {
      try {
        const platform = androidTokens.includes(token) ? 'android' : 'ios'
        const message: Record<string, unknown> = {
          message: {
            token,
            notification: { title, body },
            data: {
              type: 'signalement',
              signalement_id: String(signalementId),
              notification_type: type,
              notification_id: notificationId,
              campaign_key: notificationId,
              commune_id: communeId ? String(communeId) : '',
              ...(newStatus ? { status: String(newStatus) } : {})
            } as Record<string, string>,
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

        if (platform === 'ios') {
          ;(message.message as Record<string, unknown>).apns = {
            headers: {
              'apns-priority': '10',
              'apns-topic': 'com.communeplus.app'
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                alert: { title, body }
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
          const errorData = await response
            .json()
            .catch(() => ({ error: { message: 'Unknown error' } }))
          const errorMessage
            = (errorData as { error?: { message?: string } }).error?.message
              || `HTTP ${response.status}`

          if (
            errorMessage.includes('NOT_FOUND')
            || errorMessage.includes('INVALID_ARGUMENT')
            || errorMessage.includes('UNREGISTERED')
          ) {
            await deactivatePushTokenByValue(token)
          }
          errors.push(`Token ${token.substring(0, 20)}...: ${errorMessage}`)
        } else {
          sentCount++
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`Token ${token.substring(0, 20)}...: ${msg}`)
      }
    }

    void capturePosthogEvent('notification_sent', {
      notification_id: notificationId,
      campaign_key: notificationId,
      target_type: 'signalement',
      target_id: String(signalementId),
      commune_id: communeId ? String(communeId) : undefined,
      sent_count: sentCount,
      platform: 'mixed'
    })

    return {
      success: true,
      tokens_sent: sentCount,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, tokens_sent: 0, errors: [msg] }
  }
}
