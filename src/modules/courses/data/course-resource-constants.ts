// Constantes y helpers puros del modulo course-resources (Bloque 20).
// Aislado en su propio file SIN imports server-only para que Client
// Components consuman sin arrastrar dependencias de next/headers via
// el barrel data. Mismo patron que assignments/data/constants.ts.

// 500 MB por curso (decision A3 del planning Bloque 20).
export const COURSE_STORAGE_QUOTA_BYTES = 500 * 1024 * 1024;

// 20 MB por archivo individual.
export const COURSE_RESOURCE_FILE_MAX_BYTES = 20 * 1024 * 1024;

// MIME types permitidos para upload (A1 del planning): PDF, DOCX,
// PPTX/PPT, MP3, M4A. Sin MP4 video (link externo), sin imagenes.
export const COURSE_RESOURCE_ALLOWED_MIME_TYPES: ReadonlySet<string> =
  new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "audio/mpeg",
    "audio/mp4",
  ]);

// Labels orientados al docente para mostrar tipo de archivo en UI.
export const COURSE_RESOURCE_MIME_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PPTX",
  "application/vnd.ms-powerpoint": "PPT",
  "audio/mpeg": "MP3",
  "audio/mp4": "M4A",
};

// `accept` attribute para el input type="file". Coincide con
// COURSE_RESOURCE_ALLOWED_MIME_TYPES.
export const COURSE_RESOURCE_ACCEPT_ATTR =
  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,audio/mpeg,audio/mp4";

// Mapeo de mime type a extension. Usado para generar el storage_path.
const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
};

export function extFromMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}

// Genera el storage_path para un nuevo recurso. Convencion del bucket
// (migracion 0030): `{courseId}/{scope}/{uuid}.{ext}` donde scope es
// `general` o `modules/{moduleId}`. El courseId como primer segmento
// es lo que la RLS de Storage usa para verificar que el caller sea
// teacher asignado al curso.
export function buildCourseResourcePath(
  courseId: string,
  moduleId: string | null,
  mime: string,
): string {
  const scope = moduleId ? `modules/${moduleId}` : "general";
  const ext = extFromMime(mime);
  return `${courseId}/${scope}/${crypto.randomUUID()}.${ext}`;
}

// Formatea bytes a un label legible para el usuario.
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
