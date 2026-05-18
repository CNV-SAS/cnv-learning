// Types base del modulo assignments. Reuso de los Row generados
// por Supabase CLI (single source of truth del shape SQL).

import type { Database } from "@/types/database.generated";

export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type Submission = Database["public"]["Tables"]["submissions"]["Row"];
export type Grading = Database["public"]["Tables"]["gradings"]["Row"];
