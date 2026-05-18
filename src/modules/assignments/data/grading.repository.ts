// Repositorio de gradings (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md):
//   - Students ven gradings de OWN submissions.
//   - Teachers crean gradings + update own + ven gradings de sus
//     cursos.
//   - Admins ven todo.
//
// create: una grading por submission (unique constraint en
// submission_id). Si ya existe (re-grading), el caller usa
// update separado (no implementado en MVP).

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Database } from "@/types/database.generated";
import type { Grading } from "../types";

type GradingInsert = Database["public"]["Tables"]["gradings"]["Insert"];

export const gradingRepository = {
  async findBySubmissionId(submissionId: string): Promise<Grading | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gradings")
      .select("*")
      .eq("submission_id", submissionId)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Bulk fetch para el libro de notas del estudiante: dadas las
  // submissions del user, retorna las gradings existentes.
  async listBySubmissionIds(
    submissionIds: string[],
  ): Promise<Grading[]> {
    if (submissionIds.length === 0) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gradings")
      .select("*")
      .in("submission_id", submissionIds);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  async create(
    input: Pick<
      GradingInsert,
      "submission_id" | "graded_by" | "final_grade" | "feedback"
    >,
  ): Promise<Grading> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gradings")
      .insert(input)
      .select("*")
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to create grading",
      );
    }
    return data;
  },
};
