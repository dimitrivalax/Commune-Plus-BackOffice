import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { COMPTE_DESACTIVE_MESSAGE } from '~/utils/compte-desactive'

export { COMPTE_DESACTIVE_MESSAGE }

/** Lit les credentials Supabase depuis process.env ou runtimeConfig (ex. NUXT_PUBLIC_SUPABASE_* sur Koyeb). */
function getSupabaseCredentials(): { url: string, anonKey: string } {
  const url = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (url && anonKey) return { url, anonKey }
  try {
    const config = useRuntimeConfig()
    return {
      url: config.public?.supabaseUrl || '',
      anonKey: config.public?.supabaseAnonKey || ''
    }
  } catch {
    return { url: '', anonKey: '' }
  }
}

/** Client Supabase avec service role (admin), pour créer des utilisateurs Auth, etc. */
let adminClient: SupabaseClient | null = null

export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !serviceRoleKey) return null
  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  }
  return adminClient
}

/**
 * Crée un client Supabase authentifié à partir du token dans les headers de la requête
 * @param event L'événement H3 de la requête
 * @returns Un objet contenant le client Supabase et l'utilisateur, ou null si non authentifié
 */
export async function getAuthenticatedSupabaseClient(event: H3Event): Promise<{
  supabase: SupabaseClient
  user: User | null
} | null> {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseCredentials()
  if (!supabaseUrl || !supabaseAnonKey) {
    throw createError({
      statusCode: 500,
      message: 'Supabase configuration is missing'
    })
  }

  // Récupérer le token depuis les headers Authorization ou depuis les cookies
  const authHeader = getHeader(event, 'authorization')
  const token
    = authHeader?.replace(/^Bearer\s+/i, '').trim() || getCookie(event, 'sb-access-token')

  if (!token) {
    return null
  }

  return createSupabaseClientWithToken(supabaseUrl, supabaseAnonKey, token)
}

/**
 * Crée un client Supabase authentifié à partir d'un token explicite.
 * Utile pour les requêtes multipart (upload) où le header Authorization peut être perdu.
 */
export async function getAuthenticatedSupabaseClientFromToken(token: string): Promise<{
  supabase: SupabaseClient
  user: User | null
} | null> {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseCredentials()
  if (!supabaseUrl || !supabaseAnonKey) {
    throw createError({
      statusCode: 500,
      message: 'Supabase configuration is missing'
    })
  }
  const t = token.replace(/^Bearer\s+/i, '').trim()
  if (!t) return null
  return createSupabaseClientWithToken(supabaseUrl, supabaseAnonKey, t)
}

async function createSupabaseClientWithToken(
  supabaseUrl: string,
  supabaseAnonKey: string,
  token: string
): Promise<{ supabase: SupabaseClient; user: User | null } | null> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return { supabase, user }
}

/**
 * Vérifie l'authentification et retourne le client Supabase authentifié
 * Lance une erreur 401 si l'utilisateur n'est pas authentifié
 */
export async function requireAuth(event: H3Event): Promise<{
  supabase: SupabaseClient
  user: User | null
}> {
  const auth = await getAuthenticatedSupabaseClient(event)

  if (!auth) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized: Authentication required'
    })
  }

  return auth
}

export type UserProfileRole = 'utilisateur' | 'administrateur'

export interface CurrentUserProfile {
  utilisateurId: string
  role: UserProfileRole
  communeIds: string[]
}

/**
 * Récupère le profil utilisateur à partir d'une auth déjà obtenue (ex. token formulaire upload).
 */
export async function getCurrentUserProfileFromAuth(auth: {
  supabase: SupabaseClient
  user: User | null
}): Promise<CurrentUserProfile | null> {
  if (!auth.user) return null
  const { supabase, user } = auth

  const { data: utilisateurData, error: utilisateurError } = await supabase
    .from('utilisateur')
    .select('id, role, is_active')
    .eq('user_id', user.id)
    .single()

  if (utilisateurError || !utilisateurData) {
    return null
  }

  if (utilisateurData.is_active === false) {
    throw createError({
      statusCode: 403,
      message: COMPTE_DESACTIVE_MESSAGE
    })
  }

  const { data: associationsData, error: associationsError } = await supabase
    .from('utilisateur_commune')
    .select('commune_id')
    .eq('utilisateur_id', utilisateurData.id)

  if (associationsError) {
    return null
  }

  const communeIds = (associationsData || []).map((a: { commune_id: string }) => a.commune_id)

  return {
    utilisateurId: utilisateurData.id,
    role: utilisateurData.role as UserProfileRole,
    communeIds
  }
}

/**
 * Récupère le profil de l'utilisateur connecté (role + communes).
 * À utiliser après requireAuth(). Lance 404 si l'utilisateur n'existe pas dans la table utilisateur.
 */
export async function getCurrentUserProfile(event: H3Event): Promise<CurrentUserProfile | null> {
  const auth = await getAuthenticatedSupabaseClient(event)
  if (!auth) return null

  return getCurrentUserProfileFromAuth(auth)
}

/**
 * Récupère le profil de l'utilisateur connecté ou lance une erreur si non authentifié / non trouvé.
 */
export async function requireCurrentUserProfile(event: H3Event): Promise<CurrentUserProfile> {
  const profile = await getCurrentUserProfile(event)
  if (!profile) {
    throw createError({
      statusCode: 404,
      message: 'Profil utilisateur non trouvé'
    })
  }
  return profile
}

/**
 * Retourne l'identifiant de commune à utiliser pour une requête listant des données.
 * - Administrateur : utilise le commune_id de la query (ou undefined = pas de filtre).
 * - Utilisateur : uniquement sa commune (première de la liste) ; ignore le paramètre query pour la sécurité.
 */
export function getEffectiveCommuneIdForRequest(
  profile: CurrentUserProfile | null,
  queryCommuneId: string | undefined
): string | undefined {
  if (!profile) {
    return queryCommuneId
  }
  if (profile.role === 'administrateur') {
    return queryCommuneId
  }
  // Utilisateur : une seule commune, on impose sa commune
  return profile.communeIds.length > 0 ? profile.communeIds[0] : undefined
}
