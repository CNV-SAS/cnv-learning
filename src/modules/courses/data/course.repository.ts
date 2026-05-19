// Repositorio de courses (ARCHITECTURE.md regla dura 1: unico lugar
// donde se accede a public.courses desde codigo TypeScript).
//
// RLS aplicada: el server client respeta policies de courses (4 en
// total, DATABASE.md). En MVP los students solo ven cursos en los
// que estan enrolled via la policy "Enrolled users view their
// courses"; teachers via "Teachers view their assigned courses";
// admins ven todo.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Course } from "../types";

export const courseRepository = {
  async findById(id: string): Promise<Course | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Cursos en los que el user tiene enrollment activo. Join via
  // enrollments para resolver el match. En MVP el student tiene 1
  // curso pero el shape retornado preserva multi-curso para v2.
  async listForUser(userId: string): Promise<Course[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("course:courses(*)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (data ?? [])
      .map((row) => row.course)
      .filter((c): c is Course => c !== null);
  },

  // Verifica si un user es teacher del curso. Lee de course_teachers
  // via server client; RLS "Users view own teaching assignments"
  // permite que el teacher en cuestion vea su propia row (la admin
  // ve todas). Para otros callers (otro teacher curioso) la RLS
  // bloquea la SELECT y retorna count=0, lo cual es el comportamiento
  // correcto: no admite afirmar la asignacion ajena.
  //
  // Usado por canEmitCourseAnnouncement context resolver.
  async isTeacherOfCourse(
    userId: string,
    courseId: string,
  ): Promise<boolean> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("course_teachers")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", userId)
      .eq("course_id", courseId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (count ?? 0) > 0;
  },

  // Cursos accesibles para el caller. RLS hace el filtrado real:
  // students ven sus enrolled (via policy "Enrolled users view
  // their courses"), teachers ven sus asignados (via "Teachers
  // view their assigned courses"), admins ven todo. Un solo
  // metodo sirve para los 3 roles sin if-by-role en la app layer.
  //
  // Usado por dashboard/page.tsx para teacher y admin (que no
  // tienen enrollments, sino asignaciones via course_teachers).
  // No se usa para student porque listForUser ya devuelve sus
  // enrolled y el join via enrollments es mas barato que el
  // select all + RLS para volumen MVP.
  async listAllAccessible(): Promise<Course[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("title", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },
};
