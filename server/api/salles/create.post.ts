import {
  requireAuth,
  getCurrentUserProfile,
  getEffectiveCommuneIdForRequest,
} from "../../utils/supabase-auth";

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event);

  try {
    const body = await readBody(event);
    const profile = await getCurrentUserProfile(event);
    const effectiveCommuneId = getEffectiveCommuneIdForRequest(
      profile,
      body.commune_id,
    );

    if (!effectiveCommuneId) {
      throw createError({
        statusCode: 400,
        message: "commune_id est requis pour créer une salle",
      });
    }

    const { data, error } = await supabase
      .from("salles")
      .insert({
        nom: body.nom,
        adresse: body.adresse,
        nombre_max_places: body.nombre_max_places,
        description: body.description || null,
        photo_url: body.photo_url || null,
        commune_id: effectiveCommuneId,
      })

      .select()
      .single();

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Error creating salle: ${error.message}`,
      });
    }

    return data;
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "An error occurred while creating salle",
    });
  }
});
