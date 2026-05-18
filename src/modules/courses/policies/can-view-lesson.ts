// Policy: el usuario puede ver la leccion solicitada.
//
// Mismo patron defensa-en-profundidad documentado en
// can-view-course.ts. Para Bloque 4 thin wrapper sobre RLS: la policy
// SQL valida via join lessons -> modules -> courses + enrollment del
// user; lessonRepository.findById retorna null si no es accesible.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface LessonAccessContext {
  lessonExists: boolean;
}

export function canViewLesson(
  user: AuthenticatedUser,
  context: LessonAccessContext,
): boolean {
  if (user.role === "admin") return true;
  return context.lessonExists;
}
