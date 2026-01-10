import { createClient } from "@supabase/supabase-js";
import type { H3Event } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials are missing. Please check your environment variables."
  );
}

/**
 * Crée un client Supabase authentifié à partir du token dans les headers de la requête
 * @param event L'événement H3 de la requête
 * @returns Un objet contenant le client Supabase et l'utilisateur, ou null si non authentifié
 */
export async function getAuthenticatedSupabaseClient(event: H3Event): Promise<{
  supabase: SupabaseClient;
  user: any;
} | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw createError({
      statusCode: 500,
      message: "Supabase configuration is missing",
    });
  }

  // Récupérer le token depuis les headers Authorization ou depuis les cookies
  const authHeader = getHeader(event, "authorization");
  const token =
    authHeader?.replace("Bearer ", "") || getCookie(event, "sb-access-token");

  if (!token) {
    return null;
  }

  // Créer un client Supabase avec le token de l'utilisateur
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Vérifier que le token est valide et obtenir l'utilisateur
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { supabase, user };
}

/**
 * Vérifie l'authentification et retourne le client Supabase authentifié
 * Lance une erreur 401 si l'utilisateur n'est pas authentifié
 */
export async function requireAuth(event: H3Event): Promise<{
  supabase: SupabaseClient;
  user: any;
}> {
  const auth = await getAuthenticatedSupabaseClient(event);

  if (!auth) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Authentication required",
    });
  }

  return auth;
}
