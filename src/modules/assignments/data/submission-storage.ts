// Storage helper para submissions. Sube/borra archivos del bucket
// privado `submissions` con storage path sanitizado, valida tamano
// y MIME type, y genera signed URLs para descarga del docente.
//
// Convencion de paths: {userId}/{assignmentId}/{timestamp}-{slug}.{ext}
//   - userId/assignmentId en folders permite que la storage policy
//     "Users upload own submissions" verifique foldername[1] = user.
//   - timestamp evita colisiones entre re-uploads del mismo nombre.
//   - slug + ext sanitizados via slugify + filtro alfanum.
//
// Validacion file size + MIME hecha en el service (no aqui) para
// mantener este helper thin y reusable.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { logger } from "@/core/logger/logger";
import { slugify } from "@/lib/utils/slugify";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
]);

const BUCKET = "submissions";
const SIGNED_URL_TTL_SECONDS = 15 * 60;

// Pure: separa nombre+extension del filename original, slugifica el
// nombre (sin acentos / sin caracteres especiales) y mantiene la
// extension lowercased filtrada a alfanumericos. Edge cases:
//   - Sin punto -> todo el nombre, sin ext.
//   - Punto inicial (.gitignore) -> tratado como sin ext.
//   - Nombre vacio tras slugify -> "archivo" (placeholder).
export function sanitizeFilename(originalName: string): string {
  const lastDot = originalName.lastIndexOf(".");
  if (lastDot <= 0) {
    return slugify(originalName) || "archivo";
  }
  const name = originalName.slice(0, lastDot);
  const ext = originalName
    .slice(lastDot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const sluggedName = slugify(name) || "archivo";
  return ext ? `${sluggedName}.${ext}` : sluggedName;
}

export interface UploadResult {
  storagePath: string;
}

export const submissionStorageRepository = {
  buildStoragePath(userId: string, assignmentId: string, fileName: string): string {
    const sanitized = sanitizeFilename(fileName);
    const timestamp = Date.now();
    return `${userId}/${assignmentId}/${timestamp}-${sanitized}`;
  },

  async uploadFile(
    userId: string,
    assignmentId: string,
    file: File,
  ): Promise<UploadResult> {
    const supabase = await createClient();
    const storagePath = this.buildStoragePath(userId, assignmentId, file.name);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      logger.error("Failed to upload submission file", {
        userId,
        assignmentId,
        storagePath,
        supabaseError: error.message,
      });
      throw new InfrastructureError(ErrorCodes.STORAGE_ERROR, error.message);
    }

    return { storagePath };
  },

  // Borra archivo previo cuando el estudiante reemplaza la
  // submission en draft. NO throw: el archivo huerfano no bloquea
  // el flow del usuario; solo logueamos para futuro cleanup.
  async deleteFile(storagePath: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (error) {
      logger.warn("Failed to delete previous submission file", {
        storagePath,
        supabaseError: error.message,
      });
    }
  },

  // Signed URL para que el docente descargue la submission. TTL 15
  // min, mismo patron que lesson-attachments. Retorna null si el
  // archivo no existe (defensa para casos como blob eliminado);
  // el caller decide UI fallback.
  async getSignedUrl(storagePath: string): Promise<string | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      logger.warn("getSignedUrl submission failed", {
        storagePath,
        supabaseError: error?.message,
      });
      return null;
    }
    return data.signedUrl;
  },
};
