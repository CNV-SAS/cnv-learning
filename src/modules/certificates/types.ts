// Types base del modulo certificates. Reuso de los Row generados
// por Supabase CLI (single source of truth del shape SQL).

import type { Database } from "@/types/database.generated";

export type Certificate =
  Database["public"]["Tables"]["certificates"]["Row"];

export type CertificateStatus =
  Database["public"]["Enums"]["certificate_status"];

// Shape consumido por /verify/[id] pagina publica. Incluye campos
// del cert + nombre del estudiante + titulo del curso resueltos en
// un solo embed PostgREST. NO incluye email del estudiante (no
// queremos exponerlo en endpoint publico sin auth).
export interface CertificateForVerify {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  hash: string;
  template_version: string;
  status: CertificateStatus;
  studentName: string;
  courseTitle: string;
}
