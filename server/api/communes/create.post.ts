import { requireAuth } from "../../utils/supabase-auth";
import { requireCurrentUserProfile } from "../../utils/supabase-auth";

export default eventHandler(async (event) => {
  const { supabase } = await requireAuth(event);
  const profile = await requireCurrentUserProfile(event);

  if (profile.role !== "administrateur") {
    throw createError({
      statusCode: 403,
      message: "Accès réservé aux administrateurs",
    });
  }

  try {
    const body = await readBody(event);

    const { data, error } = await supabase
      .from("commune")
      .insert({
        name: body.name,
        postal_code: body.postal_code,
        email: body.email,
        logo_url: body.logo_url,
        feature_reservations_salles:
          body.feature_reservations_salles !== false,
        feature_propositions: body.feature_propositions !== false,
      })
      .select()
      .single();

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Erreur lors de la création de la commune : ${error.message}`,
      });
    }

    return data;
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message:
        error.message ||
        "Une erreur est survenue lors de la création de la commune",
    });
  }
});
