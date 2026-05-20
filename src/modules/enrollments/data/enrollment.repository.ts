// Repositorio de enrollments (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md): users ven sus propios enrollments,
// teachers de sus cursos, admins todo. La policy "Users view own
// enrollments" hace el filtrado por auth.uid().

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Enrollment } from "../types";

export const enrollmentRepository = {
  async getActiveForUser(userId: string): Promise<Enrollment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // Verifica si un user tiene enrollment activo en un curso. Usado
  // por canAccessTeacherStudentDetail para validar que el teacher
  // que pide ver detalle de un alumno realmente tiene a ese alumno
  // enrolled en su curso (defensa contra URL manipulation).
  async findActiveByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Roster del curso: enrollments activos para un course_id. RLS
  // "Teachers view enrollments of their courses" (0018) deja al
  // teacher ver los enrollments de sus cursos; el admin via manage.
  // Usado por teacher-panel para construir la tabla de alumnos.
  async listActiveByCourse(courseId: string): Promise<Enrollment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("course_id", courseId)
      .eq("is_active", true);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },
};
