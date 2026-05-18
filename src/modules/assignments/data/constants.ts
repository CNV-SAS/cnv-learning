// Constantes del modulo assignments. Aislado en su propio file (sin
// imports Server) para que Client Components puedan consumirlo sin
// arrastrar dependencias de next/headers via el barrel data.
//
// El bug que motiva esta separacion (Bloque 6 sub-bloque 6.4-fix):
// SubmitForm (Client) importaba MAX_FILE_SIZE_BYTES desde el barrel
// `assignments/data`, que re-exporta submission-storage.ts (que
// importa createClient -> next/headers). Next.js fallaba el build
// con boundary violation Server -> Client.

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
]);
