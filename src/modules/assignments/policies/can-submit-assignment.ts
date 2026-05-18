// Policy: el usuario puede entregar a esta assignment.
//
// Patron defensa-en-profundidad (establecido en Bloque 4 sub-bloque
// 4.2, ver can-view-course.ts): policy = early failure con error
// claro, RLS = security boundary real. Para acciones mutativas como
// esta, la policy tiene logica propia (no solo trust RLS): valida
// rol = student y deadline antes de tocar el repo.
//
// Reglas:
//   - admin/teacher: NO. No entregan tareas (admin tiene panel
//     separado, teacher las califica).
//   - student: SI si assignment existe (RLS lo validara contra
//     enrollment) Y no hay due_at o due_at > now.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface AssignmentSubmitContext {
  // True si assignmentRepository.findById retorno != null (RLS aprobo
  // que el user puede ver el assignment de raiz).
  assignmentExists: boolean;
  // Plazo de entrega. null = sin plazo (siempre permitido). Date
  // pasada = bloqueado. Date futura = permitido.
  dueAt: Date | null;
}

export function canSubmitAssignment(
  user: AuthenticatedUser,
  context: AssignmentSubmitContext,
): boolean {
  if (user.role !== "student") return false;
  if (!context.assignmentExists) return false;
  if (context.dueAt === null) return true;
  return context.dueAt.getTime() > Date.now();
}
