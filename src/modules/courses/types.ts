// Types base del modulo courses. Reuso de los Row types generados
// por Supabase CLI (single source of truth del shape SQL).
//
// Module nombrado tal cual (no CourseModule): consistente con el
// vocabulario del dominio (DATABASE.md tabla `modules`) y con el
// patron de profile/lesson/course; el riesgo de colision con
// "module" de ES es nulo en posiciones de export local.

import type { Database } from "@/types/database.generated";

export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Module = Database["public"]["Tables"]["modules"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type LessonType = Database["public"]["Enums"]["lesson_type"];
export type LessonAttachment =
  Database["public"]["Tables"]["lesson_attachments"]["Row"];
