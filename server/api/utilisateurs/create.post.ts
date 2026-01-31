import { requireAuth } from "../../utils/supabase-auth";
import { requireCurrentUserProfile } from "../../utils/supabase-auth";
import { getSupabaseAdminClient } from "../../utils/supabase-auth";
import { sendEmail } from "../../utils/emails";

export default eventHandler(async (event) => {
  await requireAuth(event);
  const profile = await requireCurrentUserProfile(event);

  if (profile.role !== "administrateur") {
    throw createError({
      statusCode: 403,
      message: "Accès réservé aux administrateurs",
    });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw createError({
      statusCode: 500,
      message:
        "Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY) pour la création d'utilisateurs",
    });
  }

  try {
    const body = await readBody(event);
    const { email, nom, prenom, role, communes } = body as {
      email: string;
      nom: string;
      prenom: string;
      role?: "utilisateur" | "administrateur";
      communes?: string[];
    };

    if (!email || !nom || !prenom) {
      throw createError({
        statusCode: 400,
        message: "Email, nom et prénom sont requis",
      });
    }

    // Générer un mot de passe temporaire aléatoire
    const tempPassword =
      Math.random().toString(36).slice(-12) +
      Math.random().toString(36).toUpperCase().slice(-4) +
      "!";

    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          last_name: nom,
          first_name: prenom,
        },
      });

    if (authError) {
      throw createError({
        statusCode: 400,
        message:
          authError.message || "Erreur lors de la création du compte auth",
      });
    }

    if (!authData.user) {
      throw createError({
        statusCode: 500,
        message: "Erreur lors de la création de l'utilisateur auth",
      });
    }

    // Utiliser upsert au lieu d'insert car un trigger Supabase peut déjà avoir créé le profil
    const { data: utilisateurData, error: utilisateurError } = await adminClient
      .from("utilisateur")
      .upsert(
        {
          user_id: authData.user.id,
          nom,
          prenom,
          email,
          role: role || "utilisateur",
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();

    if (utilisateurError) {
      // Si l'upsert échoue vraiment, on nettoie le compte auth
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw createError({
        statusCode: 500,
        message: `Erreur lors de la création du profil : ${utilisateurError.message}`,
      });
    }

    let communeNames: string[] = [];
    if (
      communes &&
      Array.isArray(communes) &&
      communes.length > 0 &&
      utilisateurData?.id
    ) {
      const associations = communes.map((communeId: string) => ({
        utilisateur_id: utilisateurData.id,
        commune_id: communeId,
      }));
      const { error: assocError } = await adminClient
        .from("utilisateur_commune")
        .insert(associations);

      if (assocError) {
        console.error("Erreur lors de l'association des communes:", assocError);
      }

      // Récupérer les noms des communes pour l'email
      const { data: communesData, error: communesError } = await adminClient
        .from("commune")
        .select("name")
        .in("id", communes);

      if (communesError) {
        console.error(
          "Erreur lors de la récupération des noms de communes:",
          communesError,
        );
      }

      if (communesData) {
        communeNames = communesData.map((c) => c.name);
      }
    }

    // Envoyer l'email de bienvenue
    const loginUrl = `${process.env.APP_URL || "https://backoffice.commune-plus.fr"}/login`;
    const communesList =
      communeNames.length > 0
        ? `<ul>${communeNames.map((name) => `<li>${name}</li>`).join("")}</ul>`
        : "aucune commune spécifique pour le moment.";

    const emailResult = await sendEmail({
      to: email,
      subject: "Bienvenue sur Commune Plus",
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
            <li>Rendez-vous sur la page de connexion : <a href="${loginUrl}">${loginUrl}</a></li>
            <li>Cliquez sur "Mot de passe oublié"</li>
            <li>Saisissez votre adresse email (${email})</li>
            <li>Suivez les instructions reçues par email pour créer votre mot de passe</li>
          </ol>
          <p>À bientôt sur l'interface de gestion Commune Plus.</p>
        </div>
      `,
      text: `
Bienvenue sur Commune Plus !

Bonjour ${prenom} ${nom},

Votre compte a été créé avec succès par un administrateur.
Vous êtes associé aux communes suivantes : ${communeNames.join(", ") || "aucune"}.

Comment vous connecter ?
Pour votre première connexion, vous devez définir votre mot de passe :
1. Rendez-vous sur la page de connexion : ${loginUrl}
2. Cliquez sur "Mot de passe oublié"
3. Saisissez votre adresse email (${email})
4. Suivez les instructions reçues par email pour créer votre mot de passe

À bientôt sur l'interface de gestion Commune Plus.
      `.trim(),
    });

    if (!emailResult.success) {
      console.error(
        "Erreur lors de l'envoi de l'email de bienvenue:",
        emailResult.error,
      );
    }

    return {
      success: true,
      id: utilisateurData?.id,
      user_id: authData.user.id,
    };
  } catch (error: any) {
    console.error(
      "Erreur détaillée lors de la création de l'utilisateur:",
      error,
    );
    throw createError({
      statusCode: error.statusCode || 500,
      message:
        error.message ||
        "Une erreur est survenue lors de la création de l'utilisateur",
    });
  }
});
