import { createHmac, timingSafeEqual } from 'node:crypto'

export interface FacebookSignedRequestPayload {
  algorithm: string
  issued_at: number
  user_id: string
  expires?: number
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return Buffer.from(normalized + padding, 'base64')
}

export function parseFacebookSignedRequest(signedRequest: string): FacebookSignedRequestPayload {
  const config = useRuntimeConfig()
  if (!config.facebookAppSecret) {
    throw createError({
      statusCode: 503,
      message: 'FACEBOOK_APP_SECRET manquant'
    })
  }

  const [encodedSig, payloadRaw] = signedRequest.split('.', 2)
  if (!encodedSig || !payloadRaw) {
    throw createError({ statusCode: 400, message: 'signed_request mal forme' })
  }

  const expected = createHmac('sha256', config.facebookAppSecret)
    .update(payloadRaw)
    .digest()
  const provided = base64UrlDecode(encodedSig)

  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw createError({ statusCode: 400, message: 'Signature signed_request invalide' })
  }

  let payload: FacebookSignedRequestPayload
  try {
    payload = JSON.parse(base64UrlDecode(payloadRaw).toString('utf8')) as FacebookSignedRequestPayload
  } catch {
    throw createError({ statusCode: 400, message: 'Payload signed_request mal forme' })
  }

  if (payload.algorithm !== 'HMAC-SHA256') {
    throw createError({ statusCode: 400, message: 'Algorithme signed_request inattendu' })
  }
  if (!payload.user_id) {
    throw createError({ statusCode: 400, message: 'user_id manquant dans signed_request' })
  }

  return payload
}
