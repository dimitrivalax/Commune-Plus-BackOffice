import { getFCMAccessToken, getFCMProjectId } from './fcm-auth'
import {
  deactivatePushTokenByValue,
  fetchPushTokensForPublish
} from './push-tokens-db'
import { capturePosthogEvent } from './posthog-server'

interface SendNewPropositionNotificationOptions {
  propositionId: string
  communeId: string
  propositionName: string
}

export async function sendNewPropositionNotification(
  options: SendNewPropositionNotificationOptions
): Promise<{ success: boolean, tokens_sent: number, errors?: string[] }> {
  const { propositionId, communeId, propositionName } = options
  const notificationId = `proposition_${propositionId}_new_${Date.now()}`

  try {
    const accessToken = await getFCMAccessToken()
    const projectId = await getFCMProjectId()
    const pushTokens = await fetchPushTokensForPublish(communeId)

    if (!pushTokens || pushTokens.length === 0) {
      return { success: true, tokens_sent: 0 }
    }

    const title = 'Nouvelle proposition'
    const body = propositionName
      ? `La mairie a publié une nouvelle proposition : "${propositionName}"`
      : 'La mairie a publié une nouvelle proposition'

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
              type: 'proposition',
              proposition_id: String(propositionId),
              notification_type: 'new_proposition',
              notification_id: notificationId,
              campaign_key: notificationId,
              commune_id: String(communeId)
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                icon: 'ic_notification',
                channel_id: 'default',
                tag: `proposition_${propositionId}`
              }
            }
          }
        }

        if (platform === 'ios') {
          ;(message.message as Record<string, unknown>).apns = {
            headers: { 'apns-priority': '10' },
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
            || errorMessage.includes('UNREGISTERED')
            || errorMessage.includes('INVALID_ARGUMENT')
          ) {
            await deactivatePushTokenByValue(token)
          }
          errors.push(`Token ${token.substring(0, 10)}...: ${errorMessage}`)
        } else {
          sentCount++
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`Token ${token.substring(0, 10)}...: ${msg}`)
      }
    }

    void capturePosthogEvent('notification_sent', {
      notification_id: notificationId,
      campaign_key: notificationId,
      target_type: 'proposition',
      target_id: String(propositionId),
      commune_id: String(communeId),
      sent_count: sentCount,
      platform: 'mixed',
      notification_type: 'new_proposition'
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
