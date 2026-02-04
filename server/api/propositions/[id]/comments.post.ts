import { requireAuth } from "../../../utils/supabase-auth";
import { z } from "zod";

const bodySchema = z.object({
  content: z.string().min(1, "Le commentaire ne peut pas être vide"),
});

export default eventHandler(async (event) => {
  const { supabase } = await requireAuth(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Proposition ID is required",
    });
  }

  const body = await readBody(event);
  const { content } = bodySchema.parse(body);

  const { data: proposition, error: propError } = await supabase
    .from("propositions")
    .select("commune_id")
    .eq("id", id)
    .single();

  if (propError || !proposition) {
    throw createError({
      statusCode: 404,
      message: "Proposition not found",
    });
  }

  const { data: commune, error: communeError } = await supabase
    .from("commune")
    .select("name")
    .eq("id", proposition.commune_id)
    .single();

  if (communeError || !commune?.name) {
    throw createError({
      statusCode: 500,
      message: "Commune not found",
    });
  }

  const { data: comment, error: insertError } = await supabase
    .from("proposition_comments")
    .insert({
      proposition_id: id,
      user_firstname: "Mairie",
      user_lastname: commune.name,
      user_email: "mairie@commune",
      content: content.trim(),
    })
    .select()
    .single();

  if (insertError) {
    throw createError({
      statusCode: 500,
      message: `Error creating comment: ${insertError.message}`,
    });
  }

  return comment;
});
