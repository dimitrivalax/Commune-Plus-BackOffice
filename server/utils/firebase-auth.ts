import type { H3Event } from 'h3'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminFirestore } from './firebase-admin-app'
import { COMPTE_DESACTIVE_MESSAGE } from '~/utils/compte-desactive'

export { COMPTE_DESACTIVE_MESSAGE }

function getBearerToken(event: H3Event): string | null {
  const authHeader = getHeader(event, 'authorization')
  const fromHeader = authHeader?.replace(/^Bearer\s+/i, '').trim()
  if (fromHeader) return fromHeader
  return getCookie(event, 'sb-access-token')?.trim() || null
}

/**
 * Vérifie le token Firebase (Authorization ou cookie legacy).
 */
export async function requireAuth(event: H3Event): Promise<{ uid: string }> {
  const token = getBearerToken(event)
  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized: Authentication required',
    })
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    return { uid: decoded.uid }
  } catch {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized: Invalid token',
    })
  }
}

export async function getAuthenticatedUidForRequest(
  event: H3Event,
): Promise<{ uid: string } | null> {
  const token = getBearerToken(event)
  if (!token) return null
  return getAuthenticatedUidFromToken(token)
}

export async function getAuthenticatedUidFromToken(
  tokenRaw: string,
): Promise<{ uid: string } | null> {
  const token = tokenRaw.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    return { uid: decoded.uid }
  } catch {
    return null
  }
}

export type UserProfileRole = 'utilisateur' | 'administrateur'

export interface CurrentUserProfile {
  utilisateurId: string
  role: UserProfileRole
  communeIds: string[]
}

async function loadProfileForUid(uid: string): Promise<CurrentUserProfile | null> {
  const db = getAdminFirestore()
  const utilSnap = await db
    .collection('utilisateur')
    .where('user_id', '==', uid)
    .limit(1)
    .get()
  if (utilSnap.empty) return null

  const utilDoc = utilSnap.docs[0]!
  const utilisateurData = utilDoc.data()
  if (utilisateurData.is_active === false) {
    throw createError({
      statusCode: 403,
      message: COMPTE_DESACTIVE_MESSAGE,
    })
  }

  const utilisateurId = utilDoc.id
  const assocSnap = await db
    .collection('utilisateur_commune')
    .where('utilisateur_id', '==', utilisateurId)
    .get()

  const communeIds = assocSnap.docs
    .map((d) => d.get('commune_id') as string)
    .filter(Boolean)

  return {
    utilisateurId,
    role: utilisateurData.role as UserProfileRole,
    communeIds,
  }
}

/**
 * Récupère le profil après requireAuth (par événement).
 */
export async function getCurrentUserProfile(
  event: H3Event,
): Promise<CurrentUserProfile | null> {
  const token = getBearerToken(event)
  if (!token) return null
  try {
    const { uid } = await getAdminAuth().verifyIdToken(token)
    return await loadProfileForUid(uid)
  } catch {
    return null
  }
}

export async function getCurrentUserProfileFromUid(
  uid: string,
): Promise<CurrentUserProfile | null> {
  return loadProfileForUid(uid)
}

export async function requireCurrentUserProfile(
  event: H3Event,
): Promise<CurrentUserProfile> {
  const profile = await getCurrentUserProfile(event)
  if (!profile) {
    throw createError({
      statusCode: 404,
      message: 'Profil utilisateur non trouvé',
    })
  }
  return profile
}

export function getEffectiveCommuneIdForRequest(
  profile: CurrentUserProfile | null,
  queryCommuneId: string | undefined,
): string | undefined {
  if (!profile) {
    return queryCommuneId
  }
  if (profile.role === 'administrateur') {
    return queryCommuneId
  }
  return profile.communeIds.length > 0 ? profile.communeIds[0] : undefined
}

export function assertCanManageCommune(
  profile: CurrentUserProfile,
  communeId: string | undefined,
) {
  if (!communeId) {
    throw createError({
      statusCode: 400,
      message: 'commune_id requis',
    })
  }
  if (profile.role === 'administrateur') return
  if (!profile.communeIds.includes(communeId)) {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé pour cette commune',
    })
  }
}

/** Timestamp serveur pour champs updated_at / created_at. */
export function serverTimestamp() {
  return FieldValue.serverTimestamp()
}
