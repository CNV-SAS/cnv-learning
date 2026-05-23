// Policy: el usuario puede editar el contenido (modulos, lecciones,
// tareas) de este curso. Modelo paralelo a canEmitCourseAnnouncement
// (B10): admin desbloqueo total, teacher solo si esta asignado al
// curso via course_teachers.
//
// Reglas (Bloque 19):
//   - admin: SI (manage announcements policy + admin manage courses).
//   - teacher + asignado al curso (course_teachers): SI.
//   - teacher NO asignado: NO. Aunque el RLS le permita VER el curso
//     publicado, no le permite editarlo.
//   - student: NO.
//
// Context: el caller pre-resuelve courseExists (via
// courseRepository.findById !== null) y isTeacherOfCourse (via
// courseRepository.isTeacherOfCourse) para mantener la policy pura
// y sync.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface CourseContentEditContext {
  courseExists: boolean;
  isTeacherOfCourse: boolean;
}

export function canEditCourseContent(
  user: AuthenticatedUser,
  context: CourseContentEditContext,
): boolean {
  if (!context.courseExists) return false;
  if (user.role === "admin") return true;
  if (user.role === "teacher") return context.isTeacherOfCourse;
  return false;
}
