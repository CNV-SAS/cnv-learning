// Repositorio de submissions (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md):
//   - Students ven/crean/editan-draft own submissions.
//   - Teachers ven submissions de sus cursos.
//   - Admins ven todas.
//
// upsert: usa ON CONFLICT (assignment_id, user_id) DO UPDATE para
// los reenvios mientras la submission esta en draft. Una vez en
// status='submitted', la RLS update con `using status='draft'`
// bloquea modificaciones (defensa real). El repo confia en la RLS.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Submission } from "../types";

type SubmissionInsert =
  Database["public"]["Tables"]["submissions"]["Insert"];

import type { Database } from "@/types/database.generated";

export const submissionRepository = {
  // Usado por el grading service: el docente solo tiene el id de
  // la submission a calificar (no el user_id). RLS filtra teacher
  // a sus cursos.
  async findById(id: string): Promise<Submission | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async findByAssignmentAndUser(
    assignmentId: string,
    userId: string,
  ): Promise<Submission | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Bulk fetch para el libro de notas del estudiante: dadas las
  // assignment_ids del curso, retorna las submissions del user en
  // esas assignments (puede tener menos que assignmentIds.length).
  async listByAssignmentIdsForUser(
    assignmentIds: string[],
    userId: string,
  ): Promise<Submission[]> {
    if (assignmentIds.length === 0) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .in("assignment_id", assignmentIds)
      .eq("user_id", userId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // Bandeja del docente: submissions con status='submitted' del
  // curso, ordenadas por submitted_at (FIFO). El service compone
  // con gradings para mostrar solo pending (= sin grading) en la UI.
  async listSubmittedByCourse(courseId: string): Promise<Submission[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submissions")
      .select("*, assignments!inner(modules!inner(course_id))")
      .eq("status", "submitted")
      .eq("assignments.modules.course_id", courseId)
      .order("submitted_at", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (data ?? []) as unknown as Submission[];
  },

  async upsert(
    input: Pick<
      SubmissionInsert,
      "assignment_id" | "user_id" | "status" | "storage_path" | "essay_text" | "submitted_at"
    >,
  ): Promise<Submission> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submissions")
      .upsert(input, { onConflict: "assignment_id,user_id" })
      .select("*")
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to upsert submission",
      );
    }
    return data;
  },
};
