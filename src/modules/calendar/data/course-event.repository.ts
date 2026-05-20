// Repositorio de course_events (ARCHITECTURE.md regla 1).
//
// Usa server client (RLS aplica). La policy "Enrolled students view
// course events" filtra por curso; teachers y admins ven via FOR ALL
// con is_course_teacher / current_user_role = 'admin'. El service
// hace defense-in-depth con policy + context resuelto antes de
// llamar al repo (consideracion A6 del plan B15).

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type {
  CourseEvent,
  CourseEventInsert,
  CourseEventUpdate,
} from "../types";

export const courseEventRepository = {
  // Lista todos los eventos del curso ordenados por starts_at asc.
  // RLS filtra; si el caller no es enrolled/teacher/admin del curso,
  // devuelve [] sin error.
  async listByCourse(courseId: string): Promise<CourseEvent[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_events")
      .select("*")
      .eq("course_id", courseId)
      .order("starts_at", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // Solo eventos futuros (starts_at >= hoy). Usado por el preview
  // del panel docente para mostrar "Proximos N eventos".
  // CURRENT_DATE en postgres respeta el TZ del servidor; usamos
  // toISOString().slice(0,10) en JS para compararlo con strings
  // YYYY-MM-DD que es como se almacena el column date.
  async listUpcomingByCourse(
    courseId: string,
    limit: number,
  ): Promise<CourseEvent[]> {
    const today = new Date().toISOString().slice(0, 10);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_events")
      .select("*")
      .eq("course_id", courseId)
      .gte("starts_at", today)
      .order("starts_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  async findById(id: string): Promise<CourseEvent | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async create(input: CourseEventInsert): Promise<CourseEvent> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_events")
      .insert(input)
      .select()
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "No se pudo crear el evento",
      );
    }
    return data;
  },

  async update(id: string, fields: CourseEventUpdate): Promise<CourseEvent> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_events")
      .update(fields)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "No se pudo actualizar el evento",
      );
    }
    return data;
  },

  async deleteById(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("course_events")
      .delete()
      .eq("id", id);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },
};
