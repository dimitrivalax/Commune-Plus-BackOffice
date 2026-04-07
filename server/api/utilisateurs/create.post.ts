import { FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'node:crypto'
import {
  requireAuth,
  requireCurrentUserProfile,
} from '../../utils/firebase-auth'
import { getAdminAuth, getAdminFirestore } from '../../utils/firebase-admin-app'
import { sendEmail } from '../../utils/emails'

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
    const body = await readBody(event)
    const { email, nom, prenom, role, communes } = body as {
      email: string
      nom: string
      prenom: string
      role?: 'utilisateur' | 'administrateur'
      communes?: string[]
    }

    if (!email || !nom || !prenom) {
      throw createError({
        statusCode: 400,
        message: 'Email, nom et prénom sont requis',
      })
    }

    const tempPassword =
      `${Math.random().toString(36).slice(-12)}${Math.random().toString(36).toUpperCase().slice(-4)}!`

    const auth = getAdminAuth()
    let userRecord
    try {
      userRecord = await auth.createUser({
        email,
        password: tempPassword,
        emailVerified: true,
        displayName: `${prenom} ${nom}`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur création compte'
      throw createError({ statusCode: 400, message: msg })
    }

    const db = getAdminFirestore()
    const utilRef = db.collection('utilisateur').doc(randomUUID())

    try {
      await utilRef.set({
        user_id: userRecord.uid,
        nom,
        prenom,
        email,
        role: role || 'utilisateur',
        is_active: true,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      })
    } catch (err) {
      await auth.deleteUser(userRecord.uid)
      throw err
    }

    let communeNames: string[] = []
    if (communes && Array.isArray(communes) && communes.length > 0) {
      const wb = db.batch()
      for (const communeId of communes) {
        const aRef = db.collection('utilisateur_commune').doc()
        wb.set(aRef, {
          utilisateur_id: utilRef.id,
          commune_id: communeId,
        })
      }
      await wb.commit()

      for (const ch of communes.slice(0, 30)) {
        const cdoc = await db.collection('commune').doc(ch).get()
        if (cdoc.exists) communeNames.push(String(cdoc.get('name')))
      }
    }

    const loginUrl = `${process.env.APP_URL || 'https://backoffice.commune-plus.fr'}/login`
    const communesList =
      communeNames.length > 0
        ? `<ul>${communeNames.map((name) => `<li>${name}</li>`).join('')}</ul>`
        : 'aucune commune spécifique pour le moment.'

    const emailResult = await sendEmail({
      to: email,
      subject: 'Bienvenue sur Commune Plus',
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Bienvenue sur Commune Plus !</h2>
          <p>Bonjour ${prenom} ${nom},</p>
          <p>Votre compte a été créé avec succès par un administrateur.</p>
          <p>Vous êtes associé aux communes suivantes :</p>
          ${communesList}
          <p><strong>Comment vous connecter ?</strong></p>
          <p>Pour votre première connexion, vous devez définir votre mot de passe :</p>
          <ol>
            <li>Rendez-vous sur : <a href="${loginUrl}">${loginUrl}</a></li>
            <li>Cliquez sur « Mot de passe oublié »</li>
            <li>Saisissez votre adresse email (${email})</li>
          </ol>
        </div>
      `,
      text: `Bienvenue sur Commune Plus. Connexion : ${loginUrl}`,
    })

    if (!emailResult.success) {
      console.error('Email bienvenue:', emailResult.error)
    }

    return {
      success: true,
      id: utilRef.id,
      user_id: userRecord.uid,
    }
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string }
    console.error('Erreur création utilisateur:', error)
    throw createError({
      statusCode: e.statusCode || 500,
      message:
        e.message
        || 'Une erreur est survenue lors de la création de l\'utilisateur',
    })
  }
})
