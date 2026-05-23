// Policy: el usuario puede crear, editar o borrar recursos del curso
// (Bloque 20). Espejo de canEditCourseContent: admin OR (teacher AND
// isTeacherOfCourse).
//
// Para SELECT (descargas, lectura) las RLS de la tabla course_resources
// + del bucket course-resources cubren el filtrado (enrolled student,
// teacher de curso, admin). Esta policy es para escritura.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface CourseResourceEditContext {
  courseExists: boolean;
  isTeacherOfCourse: boolean;
}

export function canEditCourseResources(
  user: AuthenticatedUser,
  context: CourseResourceEditContext,
): boolean {
  if (!context.courseExists) return false;
  if (user.role === "admin") return true;
  if (user.role === "teacher") return context.isTeacherOfCourse;
  return false;
}
