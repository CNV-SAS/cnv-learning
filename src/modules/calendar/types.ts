// Types base del modulo calendar (Bloque 15).
//
// CourseEvent = row literal de course_events (snake_case). starts_at
// y ends_at son strings ISO YYYY-MM-DD porque postgres date se
// serializa asi (sin precision horaria, sin TZ).

import type { Database } from "@/types/database.generated";

export type CourseEvent = Database["public"]["Tables"]["course_events"]["Row"];
export type CourseEventInsert =
  Database["public"]["Tables"]["course_events"]["Insert"];
export type CourseEventUpdate =
  Database["public"]["Tables"]["course_events"]["Update"];
