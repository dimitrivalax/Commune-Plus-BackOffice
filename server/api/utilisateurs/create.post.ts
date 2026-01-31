import { requireAuth } from '../../utils/supabase-auth'
import { requireCurrentUserProfile } from '../../utils/supabase-auth'
import { getSupabaseAdminClient } from '../../utils/supabase-auth'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  if (profile.role !== 'administrateur') {
    throw createError({
      statusCode: 403,
      message: 'Accès réservé aux administrateurs'
    })
  }

  const adminClient = getSupabaseAdminClient()
  if (!adminClient) {
    throw createError({
      statusCode: 500,
      message: 'Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY) pour la création d\'utilisateurs'
    })
  }

  try {
    const body = await readBody(event)
    const { email, password, nom, prenom, role, communes } = body as {
      email: string
      password: string
      nom: string
      prenom: string
      role?: 'utilisateur' | 'administrateur'
      communes?: string[]
    }

    if (!email || !password || !nom || !prenom) {
      throw createError({
        statusCode: 400,
        message: 'Email, mot de passe, nom et prénom sont requis'
      })
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      throw createError({
        statusCode: 400,
        message: authError.message || 'Erreur lors de la création du compte'
      })
    }

    if (!authData.user) {
      throw createError({
        statusCode: 500,
        message: 'Erreur lors de la création de l\'utilisateur'
      })
    }

    const { data: utilisateurData, error: utilisateurError } = await adminClient
      .from('utilisateur')
      .insert({
        user_id: authData.user.id,
        nom,
        prenom,
        email,
        role: role || 'utilisateur'
      })
      .select('id')
      .single()

    if (utilisateurError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw createError({
        statusCode: 500,
        message: `Erreur lors de la création du profil : ${utilisateurError.message}`
      })
    }

    if (communes && Array.isArray(communes) && communes.length > 0 && utilisateurData?.id) {
      const associations = communes.map((communeId: string) => ({
        utilisateur_id: utilisateurData.id,
        commune_id: communeId
      }))
      await adminClient.from('utilisateur_commune').insert(associations)
    }

    return {
      success: true,
      id: utilisateurData?.id,
      user_id: authData.user.id
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Une erreur est survenue lors de la création de l\'utilisateur'
    })
  }
})
