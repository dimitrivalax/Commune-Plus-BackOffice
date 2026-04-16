import { getFCMAccessToken, getFCMProjectId } from './fcm-auth'
import { sendEmail } from './emails'
import {
  deactivatePushTokenByValue,
  fetchActivePushTokensByEmail
} from './push-tokens-db'
import { capturePosthogEvent } from './posthog-server'

interface SendReservationNotificationOptions {
  reservationId: string
  userEmail: string
  communeId?: string | null
  userName: string
  salleName: string
  date: string
  startTime: string
  endTime: string
  status: 'confirmée' | 'refusée'
}

export async function sendReservationNotification(
  options: SendReservationNotificationOptions
): Promise<{
  push_success: boolean
  email_success: boolean
  tokens_sent: number
  errors?: string[]
}> {
  const {
    reservationId,
    userEmail,
    communeId,
    userName,
    salleName,
    date,
    startTime,
    endTime,
    status
  } = options

  const title
    = status === 'confirmée' ? 'Réservation confirmée' : 'Réservation refusée'
  const body
    = status === 'confirmée'
      ? `Votre réservation pour la salle "${salleName}" le ${date} est confirmée.`
      : `Désolé, votre réservation pour la salle "${salleName}" le ${date} a été refusée.`

  const result = {
    push_success: false,
    email_success: false,
    tokens_sent: 0,
    errors: [] as string[]
  }
  const notificationId = `reservation_${reservationId}_${status}_${Date.now()}`

  try {
    let accessToken: string | undefined
    let projectId: string | undefined
    try {
      accessToken = await getFCMAccessToken()
      projectId = await getFCMProjectId()
    } catch (fcmInitError: unknown) {
      const msg
        = fcmInitError instanceof Error
          ? fcmInitError.message
          : String(fcmInitError)
      console.warn('FCM not configured or failed:', msg)
      result.errors.push(`FCM Config: ${msg}`)
    }

    if (accessToken && projectId) {
      const pushTokens = await fetchActivePushTokensByEmail(userEmail)
      if (pushTokens && pushTokens.length > 0) {
        for (const t of pushTokens) {
          try {
            const message: Record<string, unknown> = {
              message: {
                token: t.token,
                notification: { title, body },
                data: {
                  type: 'reservation',
                  reservation_id: String(reservationId),
                  status: String(status),
                  notification_id: notificationId,
                  campaign_key: notificationId,
                  commune_id: communeId ? String(communeId) : ''
                },
                android: {
                  priority: 'high',
                  notification: {
                    sound: 'default',
                    channel_id: 'default',
                    tag: `reservation_${reservationId}`
                  }
                }
              }
            }

            if (t.platform === 'ios') {
              ;(message.message as Record<string, unknown>).apns = {
                headers: {
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

            if (response.ok) {
              result.tokens_sent++
            } else {
              const errData = await response.json().catch(() => ({}))
              const errStr = JSON.stringify(errData)
              if (
                errStr.includes('NOT_FOUND')
                || errStr.includes('UNREGISTERED')
              ) {
                await deactivatePushTokenByValue(t.token)
              }
              result.errors.push(`FCM Error (${t.platform}): ${errStr}`)
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            result.errors.push(`Push error for token: ${msg}`)
          }
        }
        result.push_success = result.tokens_sent > 0
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Push notification failed:', error)
    result.errors.push(`Global push error: ${msg}`)
  }

  try {
    const emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: ${status === 'confirmée' ? '#10b981' : '#ef4444'};">${title}</h2>
        <p>Bonjour ${userName},</p>
        <p>${body}</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Salle :</strong> ${salleName}</p>
          <p style="margin: 5px 0 0 0;"><strong>Date :</strong> ${date}</p>
          <p style="margin: 5px 0 0 0;"><strong>Horaire :</strong> ${startTime} - ${endTime}</p>
        </div>
        <p>Vous pouvez consulter les détails de votre réservation sur l'application mobile Commune Plus.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #6b7280;">Ceci est un message automatique, merci de ne pas y répondre.</p>
      </div>
    `

    const emailResult = await sendEmail({
      to: userEmail,
      subject: `[Commune Plus] ${title}`,
      html: emailHtml
    })

    result.email_success = emailResult.success
    if (!emailResult.success && emailResult.error) {
      result.errors.push(`Email error: ${emailResult.error}`)
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Email sending failed:', error)
    result.errors.push(`Global email error: ${msg}`)
  }

  void capturePosthogEvent('notification_sent', {
    notification_id: notificationId,
    campaign_key: notificationId,
    target_type: 'reservation',
    target_id: String(reservationId),
    commune_id: communeId ? String(communeId) : undefined,
    sent_count: result.tokens_sent,
    platform: 'mixed'
  })

  return result
}
