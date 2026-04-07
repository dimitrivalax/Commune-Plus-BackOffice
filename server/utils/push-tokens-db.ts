import { getAdminFirestore } from './firebase-admin-app'

export interface PushTokenRow {
  token: string
  platform: string
}

function getUniqueByToken(rows: PushTokenRow[]): PushTokenRow[] {
  const seen = new Set<string>()
  return rows.filter((r) => {
    if (seen.has(r.token)) return false
    seen.add(r.token)
    return true
  })
}

/** Tokens actifs pour un user_id (identifiant côté mobile). */
export async function fetchActivePushTokensByUserId(
  userId: string,
): Promise<PushTokenRow[]> {
  const db = getAdminFirestore()
  const snap = await db
    .collection('push_token')
    .where('user_id', '==', userId)
    .get()
  const out: PushTokenRow[] = []
  for (const doc of snap.docs) {
    if (doc.get('is_active') === false) continue
    const token = doc.get('token') as string
    if (!token) continue
    out.push({ token, platform: (doc.get('platform') as string) || 'android' })
  }
  return getUniqueByToken(out)
}

export async function fetchActivePushTokensByEmail(
  email: string,
): Promise<PushTokenRow[]> {
  const db = getAdminFirestore()
  const normalized = email.trim().toLowerCase()
  const snap = await db
    .collection('push_token')
    .where('email', '==', normalized)
    .get()
  const out: PushTokenRow[] = []
  for (const doc of snap.docs) {
    if (doc.get('is_active') === false) continue
    const token = doc.get('token') as string
    if (!token) continue
    out.push({ token, platform: (doc.get('platform') as string) || 'android' })
  }
  return getUniqueByToken(out)
}

/** Tokens pour publication d’info (une commune ou toutes). */
export async function fetchPushTokensForPublish(
  communeId?: string,
): Promise<PushTokenRow[]> {
  const db = getAdminFirestore()
  const snap = communeId
    ? await db
        .collection('push_token')
        .where('commune_id', '==', communeId)
        .get()
    : await db.collection('push_token').get()
  const out: PushTokenRow[] = []
  for (const doc of snap.docs) {
    if (doc.get('is_active') === false) continue
    const token = doc.get('token') as string
    if (!token) continue
    out.push({ token, platform: (doc.get('platform') as string) || 'android' })
  }
  return getUniqueByToken(out)
}

export async function deactivatePushTokenByValue(token: string): Promise<void> {
  const db = getAdminFirestore()
  const snap = await db
    .collection('push_token')
    .where('token', '==', token)
    .limit(25)
    .get()
  const batch = db.batch()
  for (const doc of snap.docs) {
    batch.update(doc.ref, { is_active: false })
  }
  if (!snap.empty) await batch.commit()
}
