import type { Utilisateur } from "~/types";
import { requireAuth } from "../utils/supabase-auth";

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase, user } = await requireAuth(event);

  try {
    console.log("Fetching utilisateurs for user:", user.id);
    // Utiliser la fonction RPC pour récupérer les utilisateurs avec leur dernière connexion
    const { data: utilisateursData, error: utilisateursError } =
      await supabase.rpc("get_utilisateurs_with_last_sign_in");

    if (utilisateursError) {
      throw createError({
        statusCode: 500,
        message: `Error fetching utilisateurs: ${utilisateursError.message}`,
      });
    }

    console.log("Found utilisateurs:", utilisateursData?.length || 0);

    if (!utilisateursData || utilisateursData.length === 0) {
      return [];
    }

    // Ensuite, récupérer les associations utilisateur_commune pour chaque utilisateur
    const utilisateurIds = utilisateursData.map((u) => u.id);

    const { data: associationsData, error: associationsError } = await supabase
      .from("utilisateur_commune")
      .select("utilisateur_id, commune_id")
      .in("utilisateur_id", utilisateurIds);

    console.log(
      "Found associations:",
      associationsData?.length || 0,
      "Error:",
      associationsError?.message
    );

    // Récupérer les communes associées
    const communeIds = associationsData
      ? [...new Set(associationsData.map((a: any) => a.commune_id))]
      : [];

    let communesData: any[] = [];
    if (communeIds.length > 0) {
      const { data: communes, error: communesError } = await supabase
        .from("commune")
        .select("id, name, postal_code, email")
        .in("id", communeIds);

      if (!communesError && communes) {
        communesData = communes;
      }
      console.log(
        "Found communes:",
        communesData.length,
        "Error:",
        communesError?.message
      );
    }

    // Créer un map pour associer rapidement les communes aux utilisateurs
    const communesByUtilisateurId = new Map<string, any[]>();

    if (associationsData) {
      associationsData.forEach((assoc: any) => {
        if (!communesByUtilisateurId.has(assoc.utilisateur_id)) {
          communesByUtilisateurId.set(assoc.utilisateur_id, []);
        }
        const commune = communesData.find((c) => c.id === assoc.commune_id);
        if (commune) {
          communesByUtilisateurId.get(assoc.utilisateur_id)!.push(commune);
        }
      });
    }

    // Transformer les données pour avoir un format plus simple
    // last_sign_in_at est déjà inclus dans les données récupérées par la fonction SQL
    const utilisateurs = utilisateursData.map((utilisateur: any) => {
      const communes = communesByUtilisateurId.get(utilisateur.id) || [];

      return {
        ...utilisateur,
        last_sign_in_at: utilisateur.last_sign_in_at || null,
        communes,
      };
    });

    console.log("Returning utilisateurs:", utilisateurs.length);
    return utilisateurs as Utilisateur[];
  } catch (error: any) {
    console.error("Error in utilisateurs API:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "An error occurred while fetching utilisateurs",
    });
  }
});
