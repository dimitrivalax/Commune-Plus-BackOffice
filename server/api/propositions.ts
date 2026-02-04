import { requireAuth } from "../utils/supabase-auth";
import {
  getCurrentUserProfile,
  getEffectiveCommuneIdForRequest,
} from "../utils/supabase-auth";

export default eventHandler(async (event) => {
  const { supabase } = await requireAuth(event);

  try {
    const profile = await getCurrentUserProfile(event);
    const query = getQuery(event);
    const queryCommuneId = query.commune_id as string | undefined;
    const communeId = getEffectiveCommuneIdForRequest(profile, queryCommuneId);

    let queryBuilder = supabase
      .from("propositions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (communeId) {
      queryBuilder = queryBuilder.eq("commune_id", communeId);
    } else if (profile?.role === "utilisateur") {
      // Les utilisateurs normaux ne devraient voir que leurs propres données ou rien du tout ici
      // Mais dans le backoffice, "utilisateur" peut signifier un membre de la mairie.
      // On s'en remet à getEffectiveCommuneIdForRequest.
      return [];
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Error fetching propositions: ${error.message}`,
      });
    }

    return data || [];
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "An error occurred while fetching propositions",
    });
  }
});
