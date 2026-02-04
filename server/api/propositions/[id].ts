import { requireAuth } from "../../utils/supabase-auth";
import { z } from "zod";

const updatePropositionSchema = z.object({
  is_archived: z.boolean().optional(),
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

  // GET: Fetch details with comments
  if (event.method === "GET") {
    try {
      const { data: proposition, error: propError } = await supabase
        .from("propositions")
        .select("*")
        .eq("id", id)
        .single();

      if (propError || !proposition) {
        throw createError({
          statusCode: 404,
          message: "Proposition not found",
        });
      }

      const { data: comments, error: commError } = await supabase
        .from("proposition_comments")
        .select("*")
        .eq("proposition_id", id)
        .order("created_at", { ascending: true });

      return {
        ...proposition,
        comments: comments || [],
      };
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        message: error.message,
      });
    }
  }

  // PUT: Update (Archiving)
  if (event.method === "PUT") {
    try {
      const body = await readBody(event);
      const validatedData = updatePropositionSchema.parse(body);

      const { data, error } = await supabase
        .from("propositions")
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Error updating proposition: ${error.message}`,
        });
      }

      return data;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw createError({
          statusCode: 400,
          message: `Validation error: ${error.issues.map((e: any) => e.message).join(", ")}`,
        });
      }
      throw createError({
        statusCode: error.statusCode || 500,
        message: error.message,
      });
    }
  }

  throw createError({
    statusCode: 405,
    message: "Method not allowed",
  });
});
