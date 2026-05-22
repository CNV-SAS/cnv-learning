// Policy: el usuario puede marcar la leccion como completada (S1.3).
//
// Reglas (siguiendo canSubmitAssignment como referencia):
//   - admin / teacher: NO. No registran progreso. Antes de S1.3 podian
//     crear rows en lesson_progress, lo que generaba que aparecieran
//     como "alumnos" en el panel del docente (porque la lista de
//     alumnos de un curso se deriva de lesson_progress + enrollments).
//   - student: SI si la leccion existe (RLS valida la cadena
//     lesson -> module -> course -> enrollment).
//
// Patron defensa-en-profundidad: la policy bloquea early con un error
// claro (AuthorizationError + AUTHZ_CANNOT_MARK_LESSON). RLS no es
// suficiente por si solo porque el INSERT en lesson_progress no
// restringe por rol (solo por enrollment); admin y teacher pueden
// estar enrolled en cursos como observadores y la RLS no distingue.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface LessonCompleteContext {
  lessonExists: boolean;
}

export function canCompleteLesson(
  user: AuthenticatedUser,
  context: LessonCompleteContext,
): boolean {
  if (user.role !== "student") return false;
  return context.lessonExists;
}
