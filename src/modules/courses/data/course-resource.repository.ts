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
import { logger } from "@/core/logger/logger";
import type { Database } from "@/types/database.generated";
import type { CourseResource } from "../types";

type CourseResourceInsert =
  Database["public"]["Tables"]["course_resources"]["Insert"];

export interface UpdateCourseResourceInput {
  title: string;
  description: string | null;
}

const SIGNED_URL_TTL_SECONDS = 15 * 60;
const COURSE_RESOURCES_BUCKET = "course-resources";

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

  async create(input: CourseResourceInsert): Promise<CourseResource> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_resources")
      .insert(input)
      .select("*")
      .single();
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async update(
    id: string,
    input: UpdateCourseResourceInput,
  ): Promise<CourseResource> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_resources")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("course_resources")
      .delete()
      .eq("id", id);
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Existencia rapida (head + count: 'exact' + limit 1) para decidir
  // si renderizar el link "Recursos" en la nav del curso de la vista
  // del estudiante (Bloque 20.3). Evita query completa solo para
  // saber si hay >= 1 row.
  async hasAnyForCourse(courseId: string): Promise<boolean> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("course_resources")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId)
      .limit(1);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (count ?? 0) > 0;
  },

  // Signed URL para descarga del archivo desde el bucket privado.
  // TTL 15 min (mismo que lesson_attachments). Retorna null si el
  // blob no existe (estado posible si hubo race condition durante
  // upload o si el blob se perdio en cleanup). El caller filtra.
  async getSignedUrl(storagePath: string): Promise<string | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(COURSE_RESOURCES_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      logger.warn("getSignedUrl: course resource not found in storage", {
        storagePath,
        bucket: COURSE_RESOURCES_BUCKET,
        supabaseError: error?.message,
      });
      return null;
    }
    return data.signedUrl;
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
