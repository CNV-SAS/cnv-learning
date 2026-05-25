// Repositorio de lesson_progress (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md):
//  - SELECT: users ven su propio progress; teachers de sus cursos;
//    admins todo.
//  - INSERT: users marcan su propio progress en lecciones de cursos
//    enrolled (double check user_id = auth.uid() AND is_enrolled).
//
// markCompleted usa upsert con ignoreDuplicates (= ON CONFLICT DO
// NOTHING en SQL): si el progress ya existe para esta (user_id,
// lesson_id), no falla ni duplica (el unique constraint de la
// tabla garantiza la idempotencia, pero el ignoreDuplicates evita
// el round-trip de error).

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";

export const lessonProgressRepository = {
  // Conteo de alumnos que completaron una leccion. Usado por el
  // editor de contenidos (Bloque 19.3) para calcular el impacto de
  // borrar una leccion. RLS filtra teacher a sus cursos / admin todo.
  async countByLessonId(lessonId: string): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("lesson_progress")
      .select("*", { count: "exact", head: true })
      .eq("lesson_id", lessonId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return count ?? 0;
  },

  async hasCompleted(userId: string, lessonId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lesson_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data !== null;
  },

  async markCompleted(userId: string, lessonId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("lesson_progress")
      .upsert(
        { user_id: userId, lesson_id: lessonId },
        { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
      );

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Fecha de la ultima lesson completada por el user dentro del curso.
  // Usado por teacher-panel para "ultima actividad" del alumno. RLS
  // de lesson_progress + lessons + modules cubre la chain (teacher
  // ve progress de students de sus cursos via policy del 0018).
  // Retorna null si el user no ha completado ninguna leccion del
  // curso.
  async getLastCompletedAtForUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<string | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lesson_progress")
      .select("completed_at, lessons!inner(modules!inner(course_id))")
      .eq("user_id", userId)
      .eq("lessons.modules.course_id", courseId)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data?.completed_at ?? null;
  },

  // Lista lesson_progress rows del user en el curso, ordenadas por
  // completed_at ASC. Usado por progressService.getRankEarnedDates
  // (Bloque 22.1) para localizar la leccion que cruzo el umbral de
  // Senior (50%) y Master (85%) y reportar la fecha en que el
  // student "consiguio" cada rank.
  async listForUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Array<{ lesson_id: string; completed_at: string }>> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lesson_progress")
      .select(
        "lesson_id, completed_at, lessons!inner(modules!inner(course_id))",
      )
      .eq("user_id", userId)
      .eq("lessons.modules.course_id", courseId)
      .order("completed_at", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (data ?? []).map((row) => ({
      lesson_id: row.lesson_id,
      completed_at: row.completed_at,
    }));
  },

  // Lista IDs de lessons completadas por el user dentro del curso. El
  // join lessons -> modules filtra por course_id; la RLS de
  // lesson_progress filtra por user_id (no hace falta agregar la
  // condicion aqui, pero la repetimos para que el plan de query sea
  // estable si la policy cambia).
  //
  // Retorna string[] de lesson_ids (no LessonProgress[] completos)
  // porque el caller solo necesita lookup por id, no metadata.
  // Menor payload de red y sin transformacion downstream.
  async listCompletedLessonIdsForUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lesson_progress")
      .select("lesson_id, lessons!inner(modules!inner(course_id))")
      .eq("user_id", userId)
      .eq("lessons.modules.course_id", courseId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (data ?? []).map((row) => row.lesson_id);
  },
};
