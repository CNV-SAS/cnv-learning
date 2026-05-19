// Types base del modulo notifications. Reuso de los Row generados
// por Supabase CLI (single source of truth del shape SQL).
//
// notification_kind enum (DATABASE.md 25-31):
//   - 'graded': el estudiante recibio calificacion publicada.
//   - 'announcement_course': anuncio emitido por docente al curso.
//   - 'announcement_global': anuncio global del admin.
//   - 'certificate_issued' / 'certificate_revoked': Bloque 12.
//   - 'submission_received': Bloque 6+ futuro, docente recibe submission.

import type { Database } from "@/types/database.generated";

export type Notification =
  Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationKind =
  Database["public"]["Enums"]["notification_kind"];

export type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];
