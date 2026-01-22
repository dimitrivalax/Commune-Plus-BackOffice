import { requireAuth } from "../../utils/supabase-auth";
import { z } from "zod";
import { sendSignalementNotification } from "../../utils/send-signalement-notification";

const updateSignalementSchema = z.object({
  status: z.enum(["en_attente", "en_cours", "traite", "archive"]).optional(),
  description: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  reponse: z.string().nullable().optional(),
});

export default eventHandler(async (event) => {
  // Vérifier l'authentification
  const { supabase } = await requireAuth(event);

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Signalement ID is required",
    });
  }

  if (event.method === "PUT") {
    try {
      const body = await readBody(event);
      const validatedData = updateSignalementSchema.parse(body);

      // Récupérer le signalement existant AVANT la mise à jour pour comparer les valeurs
      const { data: existingSignalement, error: fetchError } = await supabase
        .from("signalements")
        .select("id, status, reponse, user_id, first_name, last_name")
        .eq("id", id)
        .single();

      if (fetchError || !existingSignalement) {
        throw createError({
          statusCode: 404,
          message: `Signalement not found: ${
            fetchError?.message || "No data returned"
          }`,
        });
      }

      const oldStatus = existingSignalement.status;
      const oldReponse = existingSignalement.reponse || null;
      const userId = existingSignalement.user_id;

      const updateData: {
        status?: string;
        description?: string | null;
        comment?: string | null;
        reponse?: string | null;
        updated_at: string;
      } = {
        updated_at: new Date().toISOString(),
      };

      if (validatedData.status !== undefined) {
        updateData.status = validatedData.status;
      }

      if (validatedData.description !== undefined) {
        updateData.description = validatedData.description;
      }

      if (validatedData.comment !== undefined) {
        updateData.comment = validatedData.comment;
      }

      if (validatedData.reponse !== undefined) {
        updateData.reponse = validatedData.reponse;
      }

      // Mettre à jour le signalement
      const { data, error } = await supabase
        .from("signalements")
        .update(updateData)
        .eq("id", id)
        .select();

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error updating signalement: ${error.message}`,
        });
      }

      if (!data || data.length === 0) {
        throw createError({
          statusCode: 404,
          message: "Signalement not found after update",
        });
      }

      if (data.length > 1) {
        throw createError({
          statusCode: 500,
          message: "Multiple signalements found with the same ID",
        });
      }

      const updatedSignalement = data[0];
      const newStatus = updatedSignalement.status;
      const newReponse = updatedSignalement.reponse || null;

      // Envoyer une notification si nécessaire
      // Ne pas bloquer la réponse si l'envoi de notification échoue
      try {
        const statusChanged = validatedData.status !== undefined && newStatus !== oldStatus;
        const responseAdded = validatedData.reponse !== undefined &&
                              newReponse !== null &&
                              (oldReponse === null || oldReponse.trim() === '');

        if (statusChanged || responseAdded) {
          let notificationTitle = '';
          let notificationBody = '';
          let notificationType: 'status_change' | 'response_added' = 'status_change';

          if (responseAdded) {
            notificationTitle = 'Réponse à votre signalement';
            notificationBody = `Votre signalement a reçu une réponse de la mairie.`;
            notificationType = 'response_added';
          } else if (statusChanged) {
            const statusLabels: Record<string, string> = {
              'en_attente': 'En Attente',
              'en_cours': 'En Cours',
              'traite': 'Traité',
              'archive': 'Archivé'
            };
            notificationTitle = 'Mise à jour de votre signalement';
            notificationBody = `Le statut de votre signalement a été mis à jour : ${statusLabels[newStatus] || newStatus}`;
            notificationType = 'status_change';
          }

          if (notificationTitle && notificationBody) {
            await sendSignalementNotification({
              supabase,
              signalementId: id,
              userId: userId,
              title: notificationTitle,
              body: notificationBody,
              type: notificationType,
              newStatus: statusChanged ? newStatus : undefined
            });
          }
        }
      } catch (notificationError: any) {
        // Logger l'erreur mais ne pas faire échouer la requête
        console.error('Error sending notification for signalement:', notificationError);
      }

      return updatedSignalement;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw createError({
          statusCode: 400,
          message: `Validation error: ${error.errors
            .map((e) => e.message)
            .join(", ")}`,
        });
      }
      throw createError({
        statusCode: error.statusCode || 500,
        message:
          error.message || "An error occurred while updating the signalement",
      });
    }
  }

  throw createError({
    statusCode: 405,
    message: "Method not allowed",
  });
});
