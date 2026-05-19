// Repositorio de ai_grading_suggestions. RLS aplica
// (DATABASE.md): teachers de sus cursos INSERT y SELECT, admins
// SELECT all, students sin acceso.
//
// findLatestBySubmissionId: usado por el grader page para
// mostrar la sugerencia mas reciente cuando el docente vuelve
// (criterio de aceptacion: "al volver a entrar se muestra la
// misma sin regenerar").
//
// create: insert + return. Cada "regenerar" crea un nuevo row;
// el historial queda preservado para auditoria/analisis.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Database } from "@/types/database.generated";
import type { AiGradingSuggestion } from "../types";

type AiGradingSuggestionInsert =
  Database["public"]["Tables"]["ai_grading_suggestions"]["Insert"];

export const aiGradingSuggestionRepository = {
  async findLatestBySubmissionId(
    submissionId: string,
  ): Promise<AiGradingSuggestion | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_grading_suggestions")
      .select("*")
      .eq("submission_id", submissionId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async create(
    input: Pick<
      AiGradingSuggestionInsert,
      | "submission_id"
      | "generated_by"
      | "provider"
      | "model"
      | "prompt_version"
      | "suggested_grade"
      | "generated_feedback"
      | "raw_response"
      | "status"
      | "latency_ms"
      | "cost_tokens"
    >,
  ): Promise<AiGradingSuggestion> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_grading_suggestions")
      .insert(input)
      .select("*")
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to create AI grading suggestion",
      );
    }
    return data;
  },
};
