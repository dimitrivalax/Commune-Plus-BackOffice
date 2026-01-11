import { requireAuth } from "../../utils/supabase-auth";

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event);

  const id = getRouterParam(event, "id");
  const method = getMethod(event);

  try {
    if (method === "GET") {
      // Récupérer l'utilisateur avec sa dernière connexion
      const { data: utilisateursData, error: utilisateurError } =
        await supabase.rpc("get_utilisateurs_with_last_sign_in");

      if (utilisateurError) {
        throw createError({
          statusCode: 500,
          message: `Error fetching utilisateur: ${utilisateurError.message}`,
        });
      }

      const utilisateurData = utilisateursData?.find((u: any) => u.id === id);

      if (!utilisateurData) {
        throw createError({
          statusCode: 404,
          message: "Utilisateur not found",
        });
      }

      // Récupérer les communes associées
      const { data: associationsData, error: associationsError } =
        await supabase
          .from("utilisateur_commune")
          .select("commune_id")
          .eq("utilisateur_id", id);

      if (associationsError) {
        console.warn("Error fetching associations:", associationsError.message);
      }

      const communeIds = associationsData?.map((a) => a.commune_id) || [];
      let communesData: any[] = [];

      if (communeIds.length > 0) {
        const { data: communes, error: communesError } = await supabase
          .from("commune")
          .select("id, name, postal_code, email")
          .in("id", communeIds);

        if (!communesError && communes) {
          communesData = communes;
        }
      }

      return {
        ...utilisateurData,
        communes: communesData,
      };
    } else if (method === "PUT") {
      const body = await readBody(event);

      // Mettre à jour l'utilisateur
      const { data, error } = await supabase
        .from("utilisateur")
        .update({
          nom: body.nom,
          prenom: body.prenom,
          numero_de_rue: body.numero_de_rue || null,
          rue: body.rue || null,
          code_postal: body.code_postal || null,
          ville: body.ville || null,
          email: body.email,
          role: body.role || "utilisateur",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error updating utilisateur: ${error.message}`,
        });
      }

      // Mettre à jour les associations avec les communes
      if (body.communes && Array.isArray(body.communes)) {
        // Supprimer les anciennes associations
        await supabase
          .from("utilisateur_commune")
          .delete()
          .eq("utilisateur_id", id);

        // Créer les nouvelles associations
        if (body.communes.length > 0) {
          const associations = body.communes.map((communeId: string) => ({
            utilisateur_id: id,
            commune_id: communeId,
          }));

          const { error: assocError } = await supabase
            .from("utilisateur_commune")
            .insert(associations);

          if (assocError) {
            console.warn("Error updating associations:", assocError.message);
          }
        }
      }

      return data;
    } else if (method === "DELETE") {
      // Utiliser la fonction SQL pour supprimer l'utilisateur et son user Supabase associé
      // Cette fonction utilise SECURITY DEFINER et s'exécute côté Supabase, donc pas besoin de SUPABASE_SERVICE_ROLE_KEY
      const { data, error } = await supabase.rpc(
        "delete_utilisateur_with_auth_user",
        { p_utilisateur_id: id }
      );

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error deleting utilisateur: ${error.message}`,
        });
      }

      if (!data) {
        throw createError({
          statusCode: 500,
          message: "La suppression a échoué",
        });
      }

      return { success: true };
    } else {
      throw createError({
        statusCode: 405,
        message: "Method not allowed",
      });
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "An error occurred",
    });
  }
});
