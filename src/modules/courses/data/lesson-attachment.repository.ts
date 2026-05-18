// Repositorio de lesson_attachments (PDFs y otros archivos adjuntos).
//
// listByLesson: retorna metadata sin URLs. La URL signed se obtiene
// con getSignedUrl(storage_path) llamada en el server component al
// render, con TTL 15 min. Esa separacion evita cachear URLs
// expiradas y mantiene los repos de datos limpios de tokens de
// storage (consideracion B del plan aprobado del Bloque 4).

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { logger } from "@/core/logger/logger";
import type { LessonAttachment } from "../types";

const SIGNED_URL_TTL_SECONDS = 15 * 60;
const LESSON_MATERIALS_BUCKET = "lesson-materials";

export const lessonAttachmentRepository = {
  async listByLesson(lessonId: string): Promise<LessonAttachment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lesson_attachments")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("position", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // Genera signed URL del bucket privado. Retorna null cuando el
  // archivo no existe en Storage (estado valido en dev: el seed
  // crea registros en lesson_attachments con storage_path ficticios
  // sin subir blobs reales). El caller filtra los nulls antes de
  // renderizar. En produccion el admin sube archivos reales desde
  // el panel (Bloque 14) y este null deberia ser raro.
  //
  // Solo errores no recuperables (BD/Storage caido, permisos) se
  // elevan como InfrastructureError. "Object not found" es esperado
  // y se loguea como warn (no Sentry noise).
  async getSignedUrl(storagePath: string): Promise<string | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(LESSON_MATERIALS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      logger.warn("getSignedUrl: file not found in storage", {
        storagePath,
        bucket: LESSON_MATERIALS_BUCKET,
        supabaseError: error?.message,
      });
      return null;
    }
    return data.signedUrl;
  },
};
