// Policy: quien puede crear/editar/borrar eventos del calendario
// de un curso (Bloque 15).
//
// Reglas (plan B15):
//   - Admin: edita cualquier calendario.
//   - Teacher: edita solo el calendario del curso al que esta
//     asignado (context isTeacherOfCourse resuelto via
//     courseRepository.isTeacherOfCourse). Defense-in-depth contra
//     URL manipulation del courseId del form (consideracion A6).
//   - Student: nunca edita.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface EditCalendarContext {
  isTeacherOfCourse: boolean;
}

export function canEditCalendar(
  user: AuthenticatedUser,
  context: EditCalendarContext,
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "teacher") return context.isTeacherOfCourse;
  return false;
}
