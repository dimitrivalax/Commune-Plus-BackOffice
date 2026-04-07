import type { Utilisateur } from '~/types'
import { requireAuth, requireCurrentUserProfile } from '../utils/firebase-auth'
import { getAdminFirestore } from '../utils/firebase-admin-app'
import { chunkArray, docWithId } from '../utils/firestore-serialize'
import { FieldPath } from 'firebase-admin/firestore'
import { listUtilisateursWithLastSignIn } from '../utils/list-utilisateurs'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  if (profile.role !== 'administrateur') {
    throw createError({
      statusCode: 403,
      message: 'Accès réservé aux administrateurs',
    })
  }

  try {
    console.log('Fetching utilisateurs for admin')
    const utilisateursData = await listUtilisateursWithLastSignIn()

    if (!utilisateursData || utilisateursData.length === 0) {
      return []
    }

    const utilisateurIds = utilisateursData.map((u) => u.id as string)
    const db = getAdminFirestore()
    const assocByUser = new Map<string, { commune_id: string }[]>()

    for (const ch of chunkArray(utilisateurIds, 30)) {
      const snap = await db
        .collection('utilisateur_commune')
        .where('utilisateur_id', 'in', ch)
        .get()
      for (const doc of snap.docs) {
        const uid = doc.get('utilisateur_id') as string
        const communeId = doc.get('commune_id') as string
        if (!assocByUser.has(uid)) assocByUser.set(uid, [])
        assocByUser.get(uid)!.push({ commune_id: communeId })
      }
    }

    const communeIds = [
      ...new Set(
        [...assocByUser.values()]
          .flat()
          .map((a) => a.commune_id)
          .filter(Boolean),
      ),
    ]

    const communesData: Record<string, unknown>[] = []
    for (const ch of chunkArray(communeIds, 30)) {
      const snap = await db
        .collection('commune')
        .where(FieldPath.documentId(), 'in', ch)
        .get()
      for (const d of snap.docs) {
        const row = docWithId(d.id, d.data())
        if (row) communesData.push(row)
      }
    }

    const communesByUtilisateurId = new Map<string, typeof communesData>()
    for (const [utilId, assocs] of assocByUser) {
      const list: typeof communesData = []
      for (const a of assocs) {
        const c = communesData.find((x) => x.id === a.commune_id)
        if (c) list.push(c)
      }
      communesByUtilisateurId.set(utilId, list)
    }

    const utilisateurs = utilisateursData.map((utilisateur: Record<string, unknown>) => {
      const communes = communesByUtilisateurId.get(utilisateur.id as string) || []
      return {
        ...utilisateur,
        is_active: utilisateur.is_active !== false,
        last_sign_in_at: utilisateur.last_sign_in_at || null,
        communes,
      }
    })

    return utilisateurs as unknown as Utilisateur[]
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    console.error('Error in utilisateurs API:', error)
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred while fetching utilisateurs',
    })
  }
})
