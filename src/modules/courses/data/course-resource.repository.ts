// Repositorio de course_resources (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (migracion 0030):
//   - enrolled students: SELECT.
//   - teachers asignados al curso: SELECT + INSERT + UPDATE + DELETE.
//   - admins: SELECT + INSERT + UPDATE + DELETE.
//
// Bloque 20.1 (este archivo) implementa solo lectura. Los writes
// (create, update, delete + signed URL helpers) se incorporan en
// 20.2 con el upload flow.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { CourseResource } from "../types";

export const courseResourceRepository = {
  async findById(id: string): Promise<CourseResource | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_resources")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Lista todos los recursos de un curso, sin discriminar scope
  // (general vs modulo). El service hace el split en dos colecciones.
  // Ordena por created_at DESC para mostrar primero los mas recientes
  // (decision del planning Bloque 20: sin columna position, sin
  // reorder en MVP).
  async listByCourse(courseId: string): Promise<CourseResource[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_resources")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // Suma de size_bytes para el calculo de quota (500 MB por curso).
  // Filtra a kind='file' porque los links externos no consumen
  // Storage. Usa null-safe sum: si todos los rows tienen size_bytes
  // null (solo links), el resultado es 0.
  async sumStorageBytesForCourse(courseId: string): Promise<number> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_resources")
      .select("size_bytes")
      .eq("course_id", courseId)
      .eq("kind", "file");

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (data ?? []).reduce(
      (acc, row) => acc + Number(row.size_bytes ?? 0),
      0,
    );
  },
};
