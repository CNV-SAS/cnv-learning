// Type base del modulo progress. Reuso del Row generado por Supabase
// CLI (single source of truth del shape SQL).

import type { Database } from "@/types/database.generated";

export type LessonProgress =
  Database["public"]["Tables"]["lesson_progress"]["Row"];
