import { requireAuth, getCurrentUserProfile } from '../../../utils/firebase-auth'
import { getAdminFirestore } from '../../../utils/firebase-admin-app'
import { docWithId } from '../../../utils/firestore-serialize'
import { getFCMAccessToken, getFCMProjectId } from '../../../utils/fcm-auth'
import {
  deactivatePushTokenByValue,
  fetchPushTokensForPublish,
} from '../../../utils/push-tokens-db'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await getCurrentUserProfile(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event) as { commune_id?: string; global?: boolean }
  const { commune_id: bodyCommuneId, global: isGlobal } = body || {}

  if (isGlobal) {
    if (profile?.role !== 'administrateur') {
      throw createError({
        statusCode: 403,
        message: 'Accès réservé aux administrateurs',
      })
    }
  } else if (!bodyCommuneId) {
    throw createError({
      statusCode: 400,
      message: 'commune_id is required',
    })
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
        message:
          'FCM non configuré. Variables FCM_SERVICE_ACCOUNT_JSON ou FCM_SERVICE_ACCOUNT_PATH',
        tokens_sent: 0,
      }
    }

    const db = getAdminFirestore()
    const infoSnap = await db.collection('actualite').doc(id!).get()
    if (!infoSnap.exists) {
      throw createError({
        statusCode: 404,
        message: 'Information municipale non trouvée',
      })
    }
    const info = docWithId(infoSnap.id, infoSnap.data())!

    const pushTokens = await fetchPushTokensForPublish(
      isGlobal ? undefined : bodyCommuneId,
    )

    if (!pushTokens || pushTokens.length === 0) {
      return {
        success: true,
        message: isGlobal
          ? 'Aucun token de push trouvé'
          : 'Aucun token de push trouvé pour cette commune',
        tokens_sent: 0,
      }
    }

    const notificationTitle = String(info.category || '')
    const notificationBody = String(info.title || '')

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
            notification: {
              title: notificationTitle,
              body: notificationBody,
            },
            data: {
              type: 'actualite',
              info_id: String(info.id),
              commune_id: String(info.commune_id ?? ''),
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                icon: 'ic_notification',
                channel_id: 'default',
                tag: `info_${info.id}`,
              },
            },
          },
        }

        if (platform === 'ios') {
          ;(message.message as Record<string, unknown>).apns = {
            headers: { 'apns-priority': '10' },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                alert: {
                  title: notificationTitle,
                  body: notificationBody,
                },
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

    return {
      success: true,
      message: 'Notifications envoyées avec succès',
      tokens_sent: sentCount,
      tokens_found: pushTokens.length,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred while publishing',
    })
  }
})
