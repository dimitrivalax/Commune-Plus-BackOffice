import { FieldValue } from 'firebase-admin/firestore'
import {
  assertCanManageCommune,
  getCurrentUserProfile,
  requireAuth
} from '../../../utils/firebase-auth'
import { getAdminFirestore } from '../../../utils/firebase-admin-app'
import {
  getCommuneFacebookConfig,
  markCommuneFacebookTokenStatus
} from '../../../utils/facebook-pages-db'
import { getFacebookGraphApiBaseUrl } from '../../../utils/facebook-oauth'

interface GraphApiResponse {
  id?: string
  error?: {
    code?: number
    message?: string
  }
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/div>\s*<div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .trim()
}

function buildPostMessage(title: string, content: string): string {
  const plainTitle = htmlToPlainText(title)
  const plainContent = htmlToPlainText(content)
  return [plainTitle, plainContent].filter(Boolean).join('\n\n').slice(0, 60000)
}

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await getCurrentUserProfile(event)
  if (!profile) {
    throw createError({
      statusCode: 404,
      message: 'Profil utilisateur non trouvé'
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'id requis' })
  }

  const db = getAdminFirestore()
  const infoRef = db.collection('actualite').doc(id)
  const infoSnap = await infoRef.get()
  if (!infoSnap.exists) {
    throw createError({
      statusCode: 404,
      message: 'Information municipale non trouvée'
    })
  }

  const info = infoSnap.data() as Record<string, unknown>
  const communeId = typeof info.commune_id === 'string' ? info.commune_id : undefined
  assertCanManageCommune(profile, communeId)

  const facebookConfig = await getCommuneFacebookConfig(communeId!)
  if (!facebookConfig) {
    throw createError({
      statusCode: 412,
      message: 'Facebook non connecté pour cette commune'
    })
  }

  if (facebookConfig.token_status !== 'active') {
    throw createError({
      statusCode: 412,
      message: 'Token Facebook expiré ou révoqué. Veuillez reconnecter Facebook.'
    })
  }

  const title = String(info.title || '').trim()
  const content = String(info.content || '').trim()
  const imageUrl = typeof info.image_url === 'string' ? info.image_url : null
  const message = buildPostMessage(title, content)

  const body = imageUrl
    ? new URLSearchParams({
        caption: message,
        url: imageUrl,
        access_token: facebookConfig.page_access_token
      })
    : new URLSearchParams({
        message,
        access_token: facebookConfig.page_access_token
      })

  const endpoint = imageUrl
    ? `${getFacebookGraphApiBaseUrl()}/${facebookConfig.page_id}/photos`
    : `${getFacebookGraphApiBaseUrl()}/${facebookConfig.page_id}/feed`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  const result = await response.json().catch(() => null) as GraphApiResponse | null

  if (!response.ok || !result?.id) {
    const errorMessage = result?.error?.message || 'Publication Facebook impossible'
    const errorCode = result?.error?.code
    if (errorCode === 190) {
      await markCommuneFacebookTokenStatus(communeId!, 'expired')
    }

    await infoRef.set(
      {
        facebook_error: errorMessage,
        updated_at: FieldValue.serverTimestamp()
      },
      { merge: true }
    )

    throw createError({
      statusCode: 502,
      message: errorMessage
    })
  }

  await infoRef.set(
    {
      facebook_post_id: result.id,
      facebook_published_at: new Date().toISOString(),
      facebook_error: null,
      updated_at: FieldValue.serverTimestamp()
    },
    { merge: true }
  )

  return {
    success: true,
    facebook_post_id: result.id
  }
})
