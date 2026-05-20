// Policy: quien ve el calendario de un curso.
//
// Reglas (plan B15 decision D):
//   - Admin: ve todos los calendarios (bypass via canAccessAdmin
//     ya implicito en otras paths, aqui devolvemos true).
//   - Teacher: ve el calendario del curso al que esta asignado
//     (context isTeacherOfCourse resuelto por el caller via
//     courseRepository.isTeacherOfCourse).
//   - Student: ve el calendario del curso al que tiene enrollment
//     activo (context isEnrolledInCourse resuelto via
//     enrollmentRepository.findActiveByUserAndCourse).
//
// El contexto se pasa pre-resuelto siguiendo el pattern de las
// policies del Bloque 4+ (la BD ya hizo el trabajo via RLS, esta
// policy es defense-in-depth + UX para mostrar 404 vs forbidden).

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface ViewCalendarContext {
  isEnrolledInCourse: boolean;
  isTeacherOfCourse: boolean;
}

export function canViewCalendar(
  user: AuthenticatedUser,
  context: ViewCalendarContext,
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "teacher") return context.isTeacherOfCourse;
  if (user.role === "student") return context.isEnrolledInCourse;
  return false;
}
