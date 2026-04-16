import { getAdminAuth, getAdminFirestore } from './firebase-admin-app'
import { serializeFirestoreData } from './firestore-serialize'

/**
 * Remplace la RPC Supabase get_utilisateurs_with_last_sign_in.
 */
export async function listUtilisateursWithLastSignIn(): Promise<
  Record<string, unknown>[]
> {
  const db = getAdminFirestore()
  const auth = getAdminAuth()
  const snap = await db.collection('utilisateur').get()
  if (snap.empty) return []

  const uids = [
    ...new Set(
      snap.docs
        .map(d => d.get('user_id') as string | undefined)
        .filter(Boolean) as string[]
    )
  ]

  const lastSignInByUid = new Map<string, string | null>()
  for (let i = 0; i < uids.length; i += 100) {
    const chunk = uids.slice(i, i + 100)
    const res = await auth.getUsers(chunk.map(uid => ({ uid })))
    for (const u of res.users) {
      const t = u.metadata.lastSignInTime
      lastSignInByUid.set(
        u.uid,
        t ? new Date(t).toISOString() : null
      )
    }
  }

  return snap.docs.map((doc) => {
    const raw = { id: doc.id, ...doc.data() } as Record<string, unknown>
    const uid = raw.user_id as string | undefined
    const serialized = serializeFirestoreData(raw)
    return {
      ...serialized,
      last_sign_in_at: uid ? lastSignInByUid.get(uid) ?? null : null,
      is_active: raw.is_active !== false
    }
  })
}
