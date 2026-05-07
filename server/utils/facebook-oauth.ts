import { createHmac, randomUUID } from 'node:crypto'

interface FacebookTokenResponse {
  access_token: string
  token_type?: string
  expires_in?: number
}

interface FacebookManagedPage {
  id: string
  name: string
  access_token: string
}

interface SignedStatePayload {
  nonce: string
  communeId: string
  utilisateurId: string
  issuedAt: number
}

function getFacebookConfig() {
  const config = useRuntimeConfig()
  if (!config.facebookAppId || !config.facebookAppSecret || !config.facebookOauthCallbackUrl) {
    throw createError({
      statusCode: 503,
      message: 'Facebook OAuth non configuré (APP_ID/APP_SECRET/CALLBACK)'
    })
  }
  if (!config.facebookOauthStateSecret) {
    throw createError({
      statusCode: 503,
      message: 'FACEBOOK_OAUTH_STATE_SECRET manquant'
    })
  }
  return config
}

function getFacebookGraphApiVersion(): string {
  const version = String(useRuntimeConfig().facebookGraphApiVersion || 'v25.0').trim()
  return version.startsWith('v') ? version : `v${version}`
}

export function getFacebookGraphApiBaseUrl(): string {
  return `https://graph.facebook.com/${getFacebookGraphApiVersion()}`
}

function signStatePayload(payloadRaw: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadRaw).digest('hex')
}

export function createFacebookOAuthState(communeId: string, utilisateurId: string): string {
  const config = getFacebookConfig()
  const payload: SignedStatePayload = {
    nonce: randomUUID(),
    communeId,
    utilisateurId,
    issuedAt: Date.now()
  }
  const payloadRaw = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = signStatePayload(payloadRaw, config.facebookOauthStateSecret)
  return `${payloadRaw}.${signature}`
}

export function verifyFacebookOAuthState(state: string): SignedStatePayload {
  const config = getFacebookConfig()
  const [payloadRaw, signature] = state.split('.')
  if (!payloadRaw || !signature) {
    throw createError({ statusCode: 400, message: 'state OAuth invalide' })
  }
  const expected = signStatePayload(payloadRaw, config.facebookOauthStateSecret)
  if (expected !== signature) {
    throw createError({ statusCode: 400, message: 'state OAuth invalide' })
  }
  let payload: SignedStatePayload
  try {
    payload = JSON.parse(Buffer.from(payloadRaw, 'base64url').toString('utf8')) as SignedStatePayload
  } catch {
    throw createError({ statusCode: 400, message: 'state OAuth mal formé' })
  }
  const ageMs = Date.now() - payload.issuedAt
  if (ageMs > 15 * 60 * 1000) {
    throw createError({ statusCode: 400, message: 'state OAuth expiré' })
  }
  return payload
}

export function getFacebookOAuthUrl(state: string): string {
  const config = getFacebookConfig()
  const params = new URLSearchParams({
    client_id: config.facebookAppId,
    redirect_uri: config.facebookOauthCallbackUrl,
    response_type: 'code',
    scope: 'pages_show_list,pages_manage_posts,pages_read_engagement',
    state
  })
  return `https://www.facebook.com/${getFacebookGraphApiVersion()}/dialog/oauth?${params.toString()}`
}

export async function exchangeCodeForUserAccessToken(code: string): Promise<FacebookTokenResponse> {
  const config = getFacebookConfig()
  const params = new URLSearchParams({
    client_id: config.facebookAppId,
    client_secret: config.facebookAppSecret,
    redirect_uri: config.facebookOauthCallbackUrl,
    code
  })
  const response = await fetch(
    `${getFacebookGraphApiBaseUrl()}/oauth/access_token?${params.toString()}`
  )
  const json = await response.json().catch(() => null) as FacebookTokenResponse | null
  if (!response.ok || !json?.access_token) {
    throw createError({
      statusCode: 400,
      message: 'Échec de récupération du token Facebook'
    })
  }
  return json
}

export async function fetchFacebookUserId(userAccessToken: string): Promise<string> {
  const params = new URLSearchParams({
    fields: 'id',
    access_token: userAccessToken
  })
  const response = await fetch(`${getFacebookGraphApiBaseUrl()}/me?${params.toString()}`)
  const json = await response.json().catch(() => null) as { id?: string } | null
  if (!response.ok || !json?.id) {
    throw createError({
      statusCode: 400,
      message: 'Impossible de recuperer l\'identifiant Facebook de l\'utilisateur'
    })
  }
  return json.id
}

export async function fetchManagedFacebookPages(userAccessToken: string): Promise<FacebookManagedPage[]> {
  const params = new URLSearchParams({
    fields: 'id,name,access_token',
    access_token: userAccessToken
  })
  const response = await fetch(`${getFacebookGraphApiBaseUrl()}/me/accounts?${params.toString()}`)
  const json = await response.json().catch(() => null) as { data?: FacebookManagedPage[] } | null
  if (!response.ok) {
    throw createError({
      statusCode: 400,
      message: 'Impossible de récupérer les pages Facebook gérées'
    })
  }
  return Array.isArray(json?.data) ? json.data.filter(page => page.id && page.access_token) : []
}
