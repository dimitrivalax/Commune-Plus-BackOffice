import { FieldValue } from 'firebase-admin/firestore'
import {
  requireAuth,
  requireCurrentUserProfile,
} from '../../utils/firebase-auth'
import { getAdminAuth, getAdminFirestore } from '../../utils/firebase-admin-app'
import { chunkArray, docWithId } from '../../utils/firestore-serialize'
import { FieldPath } from 'firebase-admin/firestore'
import { listUtilisateursWithLastSignIn } from '../../utils/list-utilisateurs'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  if (profile.role !== 'administrateur') {
    throw createError({
      statusCode: 403,
      message: 'Accès réservé aux administrateurs',
    })
  }

  const id = getRouterParam(event, 'id')
  const method = getMethod(event)
  const db = getAdminFirestore()
  const auth = getAdminAuth()

  try {
    if (method === 'GET') {
      const list = await listUtilisateursWithLastSignIn()
      const utilisateurData = list.find((u) => u.id === id)
      if (!utilisateurData) {
        throw createError({ statusCode: 404, message: 'Utilisateur not found' })
      }

      const assocSnap = await db
        .collection('utilisateur_commune')
        .where('utilisateur_id', '==', id)
        .get()
      const communeIds = assocSnap.docs.map((d) => d.get('commune_id') as string)
      const communesData: Record<string, unknown>[] = []
      for (const ch of chunkArray(communeIds, 30)) {
        if (ch.length === 0) continue
        const snap = await db
          .collection('commune')
          .where(FieldPath.documentId(), 'in', ch)
          .get()
        for (const d of snap.docs) {
          const row = docWithId(d.id, d.data())
          if (row) communesData.push(row)
        }
      }

      return {
        ...utilisateurData,
        communes: communesData,
      }
    }

    if (method === 'PATCH') {
      const body = await readBody(event) as { is_active?: boolean }
      if (typeof body.is_active !== 'boolean') {
        throw createError({
          statusCode: 400,
          message: 'Le champ is_active (booléen) est requis',
        })
      }
      if (body.is_active === false && id === profile.utilisateurId) {
        throw createError({
          statusCode: 400,
          message: 'Vous ne pouvez pas désactiver votre propre compte',
        })
      }
      const ref = db.collection('utilisateur').doc(id!)
      const snap = await ref.get()
      if (!snap.exists) {
        throw createError({ statusCode: 404, message: 'Utilisateur not found' })
      }
      await ref.update({
        is_active: body.is_active,
        updated_at: FieldValue.serverTimestamp(),
      })
      const updated = await ref.get()
      return docWithId(updated.id, updated.data())
    }

    if (method === 'PUT') {
      const body = await readBody(event) as Record<string, unknown>
      if (typeof body.is_active === 'boolean') {
        if (body.is_active === false && id === profile.utilisateurId) {
          throw createError({
            statusCode: 400,
            message: 'Vous ne pouvez pas désactiver votre propre compte',
          })
        }
      }

      const ref = db.collection('utilisateur').doc(id!)
      const snap = await ref.get()
      if (!snap.exists) {
        throw createError({ statusCode: 404, message: 'Utilisateur not found' })
      }

      const uid = snap.get('user_id') as string
      const updatePayload: Record<string, unknown> = {
        nom: body.nom,
        prenom: body.prenom,
        numero_de_rue: body.numero_de_rue || null,
        rue: body.rue || null,
        code_postal: body.code_postal || null,
        ville: body.ville || null,
        email: body.email,
        role: body.role || 'utilisateur',
        updated_at: FieldValue.serverTimestamp(),
      }
      if (typeof body.is_active === 'boolean') {
        updatePayload.is_active = body.is_active
      }
      await ref.update(updatePayload)

      if (body.email && typeof body.email === 'string') {
        try {
          await auth.updateUser(uid, { email: body.email })
        } catch (err) {
          console.warn('Firebase updateUser email:', err)
        }
      }

      if (body.communes && Array.isArray(body.communes)) {
        const existing = await db
          .collection('utilisateur_commune')
          .where('utilisateur_id', '==', id)
          .get()
        const batch = db.batch()
        for (const d of existing.docs) batch.delete(d.ref)
        await batch.commit()
        if (body.communes.length > 0) {
          const wb = db.batch()
          for (const communeId of body.communes as string[]) {
            const aRef = db.collection('utilisateur_commune').doc()
            wb.set(aRef, {
              utilisateur_id: id,
              commune_id: communeId,
            })
          }
          await wb.commit()
        }
      }

      const updated = await ref.get()
      return docWithId(updated.id, updated.data())
    }

    if (method === 'DELETE') {
      const ref = db.collection('utilisateur').doc(id!)
      const snap = await ref.get()
      if (!snap.exists) {
        throw createError({ statusCode: 404, message: 'Utilisateur not found' })
      }
      const uid = snap.get('user_id') as string

      const assoc = await db
        .collection('utilisateur_commune')
        .where('utilisateur_id', '==', id)
        .get()
      const batch = db.batch()
      for (const d of assoc.docs) batch.delete(d.ref)
      batch.delete(ref)
      await batch.commit()

      try {
        await auth.deleteUser(uid)
      } catch (err) {
        console.warn('deleteUser:', err)
        throw createError({
          statusCode: 500,
          message: 'Profil supprimé mais erreur suppression compte Firebase Auth',
        })
      }

      return { success: true }
    }

    throw createError({ statusCode: 405, message: 'Method not allowed' })
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'An error occurred',
    })
  }
})
