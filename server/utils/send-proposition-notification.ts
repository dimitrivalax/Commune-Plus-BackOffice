import { getFCMAccessToken, getFCMProjectId } from './fcm-auth'
import {
  deactivatePushTokenByValue,
  fetchActivePushTokensByUserId,
} from './push-tokens-db'

interface SendPropositionNotificationOptions {
  propositionId: string
  userId: string | null
  title: string
  body: string
  type: 'vote' | 'comment'
}

export async function sendPropositionNotification(
  options: SendPropositionNotificationOptions,
): Promise<{
  success: boolean
  tokens_sent: number
  errors?: string[]
}> {
  const { propositionId, userId, title, body, type } = options

  if (!userId) {
    console.log('No user_id found for proposition, skipping notification')
    return {
      success: false,
      tokens_sent: 0,
      errors: ['No user_id found for proposition'],
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
      return { success: false, tokens_sent: 0, errors: ['FCM not configured'] }
    }

    const pushTokens = await fetchActivePushTokensByUserId(userId)

    if (!pushTokens || pushTokens.length === 0) {
      return { success: true, tokens_sent: 0 }
    }

    const androidTokens = pushTokens
      .filter((t) => t.platform === 'android')
      .map((t) => t.token)
    const iosTokens = pushTokens
      .filter((t) => t.platform === 'ios')
      .map((t) => t.token)
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
              notification_type: type,
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                icon: 'ic_notification',
                channel_id: 'default',
                tag: `proposition_${propositionId}`,
              },
            },
          },
        }

        if (platform === 'ios') {
          ;(message.message as Record<string, unknown>).apns = {
            headers: {
              'apns-priority': '10',
              'apns-topic': 'com.communeplus.app',
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                alert: { title, body },
              },
            },
          }
        }

        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          },
        )

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: { message: 'Unknown error' } }))
          const errorMessage =
            (errorData as { error?: { message?: string } }).error?.message
            || `HTTP ${response.status}`
          if (
            errorMessage.includes('NOT_FOUND')
            || errorMessage.includes('UNREGISTERED')
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

    return {
      success: true,
      tokens_sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, tokens_sent: 0, errors: [msg] }
  }
}
