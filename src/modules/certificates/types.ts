// Types base del modulo certificates. Reuso de los Row generados
// por Supabase CLI (single source of truth del shape SQL).

import type { Database } from "@/types/database.generated";

export type Certificate =
  Database["public"]["Tables"]["certificates"]["Row"];

export type CertificateStatus =
  Database["public"]["Enums"]["certificate_status"];
