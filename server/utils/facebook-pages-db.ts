import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from './firebase-admin-app'

export interface CommuneFacebookConfig {
  commune_id: string
  page_id: string
  page_name: string
  token_status: 'active' | 'revoked' | 'expired'
  created_at: string
  updated_at: string
  connected_by_utilisateur_id: string
  connected_facebook_user_asid?: string
  encrypted_page_access_token?: string
}

interface PersistFacebookConfigInput {
  communeId: string
  pageId: string
  pageName: string
  pageAccessToken: string
  connectedByUtilisateurId: string
  connectedFacebookUserAsid: string
}

interface EncryptedPayload {
  iv: string
  authTag: string
  ciphertext: string
}

function getEncryptionKey(): Buffer {
  const raw = useRuntimeConfig().facebookTokenEncryptionKey
  if (!raw) {
    throw createError({
      statusCode: 503,
      message: 'FACEBOOK_TOKEN_ENCRYPTION_KEY manquant'
    })
  }

  let key: Buffer
  try {
    key = Buffer.from(raw, 'base64')
  } catch {
    throw createError({
      statusCode: 503,
      message: 'FACEBOOK_TOKEN_ENCRYPTION_KEY invalide (base64 attendu)'
    })
  }

  if (key.length !== 32) {
    throw createError({
      statusCode: 503,
      message: 'FACEBOOK_TOKEN_ENCRYPTION_KEY doit représenter 32 octets'
    })
  }
  return key
}

function encryptToken(plainToken: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plainToken, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()
  const payload: EncryptedPayload = {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64')
  }
  return JSON.stringify(payload)
}

function decryptToken(payloadRaw: string): string {
  const key = getEncryptionKey()
  const payload = JSON.parse(payloadRaw) as EncryptedPayload
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final()
  ])
  return plain.toString('utf8')
}

export async function upsertCommuneFacebookConfig(input: PersistFacebookConfigInput) {
  const db = getAdminFirestore()
  const now = new Date().toISOString()
  const ref = db.collection('commune_facebook_config').doc(input.communeId)
  const existing = await ref.get()
  await ref.set(
    {
      commune_id: input.communeId,
      page_id: input.pageId,
      page_name: input.pageName,
      encrypted_page_access_token: encryptToken(input.pageAccessToken),
      token_status: 'active',
      connected_by_utilisateur_id: input.connectedByUtilisateurId,
      connected_facebook_user_asid: input.connectedFacebookUserAsid,
      created_at: existing.exists ? existing.get('created_at') || now : now,
      updated_at: now
    },
    { merge: true }
  )
}

export async function findCommuneFacebookConfigsByAsid(
  asid: string
): Promise<CommuneFacebookConfig[]> {
  const db = getAdminFirestore()
  const snap = await db
    .collection('commune_facebook_config')
    .where('connected_facebook_user_asid', '==', asid)
    .get()
  return snap.docs.map(doc => doc.data() as CommuneFacebookConfig)
}

export async function revokeCommuneFacebookConfig(communeId: string): Promise<void> {
  const db = getAdminFirestore()
  await db.collection('commune_facebook_config').doc(communeId).update({
    token_status: 'revoked',
    encrypted_page_access_token: FieldValue.delete(),
    connected_facebook_user_asid: FieldValue.delete(),
    updated_at: new Date().toISOString()
  })
}

/** Métadonnées Firestore sans déchiffrer le token (statut UI, déconnexion). */
export async function getCommuneFacebookConfigMeta(
  communeId: string
): Promise<CommuneFacebookConfig | null> {
  const db = getAdminFirestore()
  const snap = await db.collection('commune_facebook_config').doc(communeId).get()
  if (!snap.exists) return null
  return snap.data() as CommuneFacebookConfig
}

/** Suppression complète de la liaison Facebook pour une commune (action utilisateur). */
export async function removeCommuneFacebookConfig(communeId: string): Promise<void> {
  const db = getAdminFirestore()
  await db.collection('commune_facebook_config').doc(communeId).delete()
}

export async function getCommuneFacebookConfig(communeId: string): Promise<(CommuneFacebookConfig & { page_access_token: string }) | null> {
  const db = getAdminFirestore()
  const snap = await db.collection('commune_facebook_config').doc(communeId).get()
  if (!snap.exists) return null
  const data = snap.data() as CommuneFacebookConfig | undefined
  if (!data?.encrypted_page_access_token) return null
  return {
    ...data,
    page_access_token: decryptToken(data.encrypted_page_access_token)
  }
}

export async function markCommuneFacebookTokenStatus(
  communeId: string,
  tokenStatus: 'active' | 'revoked' | 'expired'
) {
  const db = getAdminFirestore()
  await db.collection('commune_facebook_config').doc(communeId).set(
    {
      token_status: tokenStatus,
      updated_at: new Date().toISOString()
    },
    { merge: true }
  )
}
