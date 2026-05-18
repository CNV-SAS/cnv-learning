// Policy: el usuario puede calificar esta submission.
//
// Reglas:
//   - student: NO.
//   - teacher: SI si submissionExists (RLS valida is_course_teacher).
//   - admin: SI (RLS le da everything; aqui le damos bypass explicito
//     para que pueda calificar como backup si fuera necesario, ej.
//     teacher de baja temporal).
//
// La INSERT policy de gradings (DATABASE.md) ya verifica que
// graded_by = auth.uid() AND is_course_teacher(course_id), asi que
// el flow real es: si llegan a la action y RLS los deja INSERT,
// estan autorizados. Esta policy filtra antes para early failure y
// para que el UI del grader no aparezca para students.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface AssignmentGradeContext {
  submissionExists: boolean;
}

export function canGradeAssignment(
  user: AuthenticatedUser,
  context: AssignmentGradeContext,
): boolean {
  if (user.role === "student") return false;
  return context.submissionExists;
}
