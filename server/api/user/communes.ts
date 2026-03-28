import { requireAuth } from "../../utils/supabase-auth";
import { getCurrentUserProfile } from "../../utils/supabase-auth";

export default eventHandler(async (event) => {
  const { supabase } = await requireAuth(event);
  const profile = await getCurrentUserProfile(event);

  if (!profile) {
    throw createError({
      statusCode: 404,
      message: "Utilisateur non trouvé",
    });
  }

  try {
    // Administrateur : accès à toutes les communes
    if (profile.role === "administrateur") {
      const { data: communesData, error: communesError } = await supabase
        .from("commune")
        .select(
          "id, name, postal_code, email, logo_url, feature_reservations_salles, feature_propositions, created_at, updated_at",
        )
        .order("name", { ascending: true });

      if (communesError) {
        throw createError({
          statusCode: 500,
          message: `Error fetching communes: ${communesError.message}`,
        });
      }
      return communesData || [];
    }

    // Utilisateur : uniquement ses communes (en pratique une seule)
    if (profile.communeIds.length === 0) {
      return [];
    }

    const { data: communesData, error: communesError } = await supabase
      .from("commune")
      .select("id, name, postal_code, email, logo_url, feature_reservations_salles, feature_propositions, created_at, updated_at")
      .in("id", profile.communeIds)
      .order("name", { ascending: true });

    if (communesError) {
      throw createError({
        statusCode: 500,
        message: `Error fetching communes: ${communesError.message}`,
      });
    }

    return communesData || [];
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message:
        error.message || "An error occurred while fetching user communes",
    });
  }
});
