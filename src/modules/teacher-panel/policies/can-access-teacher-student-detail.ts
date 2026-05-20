// Policy: el usuario puede ver el detalle de un alumno en un curso
// especifico desde el panel docente.
//
// Reglas:
//   - admin: SI siempre (canAccessTeacherPanel ya le permite entrar
//     al panel; aqui mantenemos coherencia).
//   - teacher: SI cuando enseña el curso Y el alumno esta enrolled
//     activo en ese curso. Defensa contra URL manipulation: sin la
//     chain teacher->course Y course->student, un teacher de otro
//     curso podria intentar ver alumnos ajenos via courseId/userId
//     en la URL.
//   - student: NO.
//
// Context resuelto por el caller (page) via dos lookups:
//   - courseRepository.isTeacherOfCourse(user.id, courseId).
//   - enrollmentRepository.findActiveByUserAndCourse(studentId, courseId).
// La RLS de profiles + enrollments + course_teachers respalda la
// decision en caso de bug en la policy.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface TeacherStudentDetailContext {
  isTeacherOfCourse: boolean;
  studentEnrolledInCourse: boolean;
}

export function canAccessTeacherStudentDetail(
  user: AuthenticatedUser,
  context: TeacherStudentDetailContext,
): boolean {
  if (user.role === "admin") return true;
  if (user.role !== "teacher") return false;
  return context.isTeacherOfCourse && context.studentEnrolledInCourse;
}
