// Repositorio de submissions (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md):
//   - Students ven/crean/editan-draft own submissions.
//   - Teachers ven submissions de sus cursos.
//   - Admins ven todas.
//
// Bloque post-23 ISSUE 3 (multi-attempt): submissions ahora tiene
// una row por intento (uniq compuesto assignment_id, user_id,
// attempt_number). El metodo upsert anterior se reemplaza por
// insertNewAttempt que calcula attempt_number = max anterior + 1.
//
// findByAssignmentAndUser cambia semantica: retorna la SUBMISSION MAS
// RECIENTE del user para ese assignment (ORDER BY attempt_number DESC
// LIMIT 1). Los callers que esperan "la submission actual" no
// requieren cambio: siempre era 1 sola y ahora es la mas reciente.
//
// Nuevos metodos para multi-attempt:
//   - listAttemptsByAssignmentAndUser: historial completo (teacher).
//   - countSubmittedAttemptsByAssignmentAndUser: count para
//     computeAssignmentStatus (intentos consumidos).
//   - listLatestByAssignmentIdsForUser: bulk latest, util para el
//     ModuleList del student.
//   - listPassedRequiredAssignmentIdsForUserAndCourse + Timeline:
//     reemplazan listSubmittedOrGraded... y filtran por nota
//     aprobada segun passing_grade del curso. El timeline usa
//     graded_at (decision Q7).
//
// listSubmittedByCourse y listSubmittedAccessible (panel docente)
// ahora filtran al LATEST por (assignment, user) en JS porque el
// teacher solo califica el intento mas reciente (decision Q3).

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Submission } from "../types";

type SubmissionInsert =
  Database["public"]["Tables"]["submissions"]["Insert"];

import type { Database } from "@/types/database.generated";

// Helper: dado un array de submissions, retorna solo la mas reciente
// por (assignment_id, user_id) usando attempt_number desc. Util para
// transformar resultados que contienen multiples intentos en "latest
// per pair" para el panel docente y el ModuleList.
function pickLatestPerAssignmentUser<T extends {
  assignment_id: string;
  user_id: string;
  attempt_number: number;
}>(rows: T[]): T[] {
  const latestByKey = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.assignment_id}|${row.user_id}`;
    const existing = latestByKey.get(key);
    if (!existing || row.attempt_number > existing.attempt_number) {
      latestByKey.set(key, row);
    }
  }
  return Array.from(latestByKey.values());
}

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

  // Bloque post-23: retorna la submission mas reciente del user para
  // el assignment (mayor attempt_number). El nombre se preserva
  // porque los callers semanticamente quieren "el estado actual"; lo
  // que cambia es que ahora puede haber multiples filas historicas.
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
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Bloque post-23: historial completo de intentos del user para un
  // assignment. Usado por el panel docente para mostrar la cronologia
  // de entregas. Ordenado ascendente por attempt_number (intento 1
  // primero).
  async listAttemptsByAssignmentAndUser(
    assignmentId: string,
    userId: string,
  ): Promise<Submission[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("user_id", userId)
      .order("attempt_number", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // Bloque post-23: count de submissions del user para un assignment
  // que estan en status submitted o graded (drafts NO cuentan,
  // decision Q2). Alimenta computeAssignmentStatus para decidir
  // attemptsUsed / attemptsRemaining.
  async countSubmittedAttemptsByAssignmentAndUser(
    assignmentId: string,
    userId: string,
  ): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("assignment_id", assignmentId)
      .eq("user_id", userId)
      .in("status", ["submitted", "graded"]);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return count ?? 0;
  },

  // Bulk fetch para el libro de notas del estudiante: todas las
  // submissions del user en esos assignments (incluyendo intentos
  // historicos). Usado por grades.service. Para callers que solo
  // quieren la latest por assignment, usar listLatestByAssignmentIds-
  // ForUser.
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

  // Bloque post-23: bulk fetch retornando SOLO la latest por
  // assignment_id para el user. Usado por /learn/[courseId] para el
  // ModuleList (mostrar marca "entregado" / chip status).
  async listLatestByAssignmentIdsForUser(
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
    return pickLatestPerAssignmentUser(data ?? []);
  },

  // Submissions vinculadas a un set de assignments (todas, sin filtro
  // por user). Usado por el editor de contenidos (B19.2) para
  // calcular impacto de borrar un modulo. RLS filtra teacher a sus
  // cursos / admin todo. Devuelve TODOS los intentos porque el impact
  // calcula cuantas rows cascadearan.
  async listByAssignmentIds(
    assignmentIds: string[],
  ): Promise<Submission[]> {
    if (assignmentIds.length === 0) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .in("assignment_id", assignmentIds);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // Bandeja global del docente (Bloque 6.5): submissions con
  // status='submitted' a las que el caller tiene acceso. Bloque
  // post-23: filtramos a la LATEST por (assignment, user) porque el
  // teacher solo califica el intento mas reciente (decision Q3). Las
  // submissions historicas en submitted (raras: implica que se
  // entregaron y nunca se calificaron antes de que el alumno
  // reintentara) quedan fuera.
  async listSubmittedAccessible(): Promise<Submission[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return pickLatestPerAssignmentUser(data ?? []);
  },

  // Fecha de la ultima submission entregada por el user dentro del
  // curso. Para teacher-panel "ultima actividad" del alumno. RLS de
  // submissions + assignments + modules cubre la chain (teacher ve
  // submissions de sus cursos). Retorna null si el user no entrego
  // nada en el curso. order desc + limit 1 ya da la mas reciente
  // (no necesita filter de latest per assignment).
  async getLastSubmittedAtForUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<string | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submissions")
      .select(
        "submitted_at, assignments!inner(modules!inner(course_id))",
      )
      .eq("user_id", userId)
      .eq("assignments.modules.course_id", courseId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data?.submitted_at ?? null;
  },

  // Bandeja por curso del teacher (Bloque 6.1). Mismo filtro latest
  // por (assignment, user) que listSubmittedAccessible (decision Q3).
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
    return pickLatestPerAssignmentUser(
      (data ?? []) as unknown as Submission[],
    );
  },

  // Bloque post-23 ISSUE 3: reemplaza listSubmittedOrGradedAssignment-
  // IdsForUserAndCourse. Ahora una tarea cuenta para el progreso solo
  // si esta APROBADA: latest attempt.status='graded' AND
  // grading.final_grade >= (passing_grade / 100) * assignment.max_score.
  //
  // Implementacion: query con embed de gradings + assignments (max_score,
  // is_required, modules.course_id), filter en JS al latest per
  // (assignment, user) y al passing threshold. Para MVP con <100
  // submissions por user el JS-filter es trivial; si escala, mover a
  // funcion SQL/RPC.
  async listPassedRequiredAssignmentIdsForUserAndCourse(
    userId: string,
    courseId: string,
    passingGradePercent: number,
  ): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submissions")
      .select(
        "assignment_id, attempt_number, status, gradings(final_grade), assignments!inner(max_score, is_required, modules!inner(course_id))",
      )
      .eq("user_id", userId)
      .eq("assignments.modules.course_id", courseId)
      .eq("assignments.is_required", true);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    if (!data || data.length === 0) return [];

    type Row = {
      assignment_id: string;
      attempt_number: number;
      status: string;
      gradings: Array<{ final_grade: number }> | null;
      assignments: { max_score: number };
    };
    const rows = data as unknown as Row[];

    // Filter al latest attempt per assignment.
    const latestByAssignment = new Map<string, Row>();
    for (const row of rows) {
      const existing = latestByAssignment.get(row.assignment_id);
      if (!existing || row.attempt_number > existing.attempt_number) {
        latestByAssignment.set(row.assignment_id, row);
      }
    }

    const passed: string[] = [];
    for (const [assignmentId, row] of latestByAssignment) {
      if (row.status !== "graded") continue;
      const grading = row.gradings?.[0];
      if (!grading) continue;
      const threshold =
        (passingGradePercent / 100) * Number(row.assignments.max_score);
      if (grading.final_grade >= threshold) {
        passed.push(assignmentId);
      }
    }
    return passed;
  },

  // Bloque post-23 ISSUE 3: timeline de tareas obligatorias APROBADAS
  // para reconstruir las fechas de rank dates (Senior/Master). Mismo
  // patron que listPassedRequiredAssignmentIds pero retorna graded_at
  // (decision Q7: usar la fecha en que el assignment efectivamente
  // contribuyo al progreso).
  async listPassedRequiredTimelineForUserAndCourse(
    userId: string,
    courseId: string,
    passingGradePercent: number,
  ): Promise<Array<{ assignment_id: string; graded_at: string }>> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submissions")
      .select(
        "assignment_id, attempt_number, status, gradings(final_grade, graded_at), assignments!inner(max_score, is_required, modules!inner(course_id))",
      )
      .eq("user_id", userId)
      .eq("assignments.modules.course_id", courseId)
      .eq("assignments.is_required", true);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    if (!data || data.length === 0) return [];

    type Row = {
      assignment_id: string;
      attempt_number: number;
      status: string;
      gradings: Array<{ final_grade: number; graded_at: string }> | null;
      assignments: { max_score: number };
    };
    const rows = data as unknown as Row[];

    const latestByAssignment = new Map<string, Row>();
    for (const row of rows) {
      const existing = latestByAssignment.get(row.assignment_id);
      if (!existing || row.attempt_number > existing.attempt_number) {
        latestByAssignment.set(row.assignment_id, row);
      }
    }

    const events: Array<{ assignment_id: string; graded_at: string }> = [];
    for (const [assignmentId, row] of latestByAssignment) {
      if (row.status !== "graded") continue;
      const grading = row.gradings?.[0];
      if (!grading) continue;
      const threshold =
        (passingGradePercent / 100) * Number(row.assignments.max_score);
      if (grading.final_grade >= threshold) {
        events.push({
          assignment_id: assignmentId,
          graded_at: grading.graded_at,
        });
      }
    }
    return events.sort((a, b) =>
      a.graded_at.localeCompare(b.graded_at),
    );
  },

  // Bloque post-23 ISSUE 3: reemplaza upsert. Insert puro de un nuevo
  // intento. El attempt_number se calcula como (max anterior del par
  // assignment_id + user_id) + 1, o 1 si es el primer intento.
  //
  // Race condition: si dos requests llegan simultaneo computan el
  // mismo nextAttempt y el segundo falla por el unique
  // (assignment_id, user_id, attempt_number). El service catchea el
  // error infra y muestra mensaje al user "intentalo de nuevo". Para
  // MVP (student no hace 2 submits paralelo) es aceptable.
  async insertNewAttempt(
    input: Pick<
      SubmissionInsert,
      | "assignment_id"
      | "user_id"
      | "status"
      | "storage_path"
      | "essay_text"
      | "quiz_answers"
      | "submitted_at"
    >,
  ): Promise<Submission> {
    const supabase = await createClient();

    const { data: maxRow, error: maxError } = await supabase
      .from("submissions")
      .select("attempt_number")
      .eq("assignment_id", input.assignment_id)
      .eq("user_id", input.user_id)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxError) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        maxError.message,
      );
    }

    const nextAttempt = (maxRow?.attempt_number ?? 0) + 1;

    const { data, error } = await supabase
      .from("submissions")
      .insert({ ...input, attempt_number: nextAttempt })
      .select("*")
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to insert submission",
      );
    }
    return data;
  },
};
