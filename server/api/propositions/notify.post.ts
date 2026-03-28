import { getSupabaseAdminClient } from "../../utils/supabase-auth";
import { z } from "zod";
import { sendPropositionNotification } from "../../utils/send-proposition-notification";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const notifySchema = z.object({
  proposition_id: z.string().uuid(),
  type: z.enum(["vote", "comment"]),
  comment_content: z.string().optional(),
});

export default eventHandler(async (event) => {
  setResponseHeaders(event, corsHeaders);
  const body = await readBody(event);
  const validatedData = notifySchema.parse(body);
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw createError({
      statusCode: 500,
      message: "Supabase admin client not initialized",
    });
  }

  // 1. Récupérer les infos de la proposition
  const { data: proposition, error: propError } = await supabase
    .from("propositions")
    .select("*")
    .eq("id", validatedData.proposition_id)
    .single();

  if (propError || !proposition) {
    throw createError({
      statusCode: 404,
      message: "Proposition not found",
    });
  }

  // 2. Préparer le contenu de la notification
  let title = "";
  let messageBody = "";

  if (validatedData.type === "vote") {
    title = "Nouveau vote !";
    messageBody = `Quelqu'un a voté pour votre proposition : "${proposition.name}"`;
  } else {
    title = "Nouveau commentaire";
    messageBody = `Quelqu'un a commenté votre proposition : "${proposition.name}"`;
    if (validatedData.comment_content) {
      // Optionnel: ajouter un aperçu du commentaire
    }
  }

  // 3. Envoyer la notification (utilisant l'utilitaire server)
  const result = await sendPropositionNotification({
    supabase,
    propositionId: proposition.id,
    userId: proposition.user_id,
    title,
    body: messageBody,
    type: validatedData.type,
  });

  return result;
});
