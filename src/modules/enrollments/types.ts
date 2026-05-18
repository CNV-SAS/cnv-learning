// Type base del modulo enrollments. Reuso del Row type generado
// por Supabase CLI.

import type { Database } from "@/types/database.generated";

export type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
