// Policy: el usuario puede ver esta tarea.
//
// Mismo patron defensa-en-profundidad de Bloque 4
// (can-view-course.ts): policy = primera linea con admin bypass,
// RLS = filtrado real. La policy "Enrolled students view
// assignments of their courses" + "Teachers view assignments of
// their courses" en SQL aseguran que assignmentRepository.findById
// retorne null si el user no es enrolled ni teacher del curso.
// La policy aqui delega a esa decision via `assignmentExists`.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface AssignmentViewContext {
  assignmentExists: boolean;
}

export function canViewAssignment(
  user: AuthenticatedUser,
  context: AssignmentViewContext,
): boolean {
  if (user.role === "admin") return true;
  return context.assignmentExists;
}
