// Policy: el usuario puede editar los metadatos del curso (titulo,
// slug, descripcion, coverUrl, is_published).
//
// Bloque 23.1 modelo B (aditivo):
//   - admin: SI.
//   - teacher + asignado al curso + can_manage_course=true: SI.
//   - teacher asignado pero SIN flag: NO. (Sigue pudiendo editar
//     contenido via canEditCourseContent; meta requiere el flag.)
//   - teacher NO asignado: NO.
//   - student: NO.
//
// Context: el caller pre-resuelve courseExists, isTeacherOfCourse,
// y canManageCourse (todos via courseRepository) para mantener la
// policy pura y sync. Defense-in-depth complementa la RLS SQL
// "Teachers manage course meta with flag" + "Admins manage courses".

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface CourseMetaEditContext {
  courseExists: boolean;
  isTeacherOfCourse: boolean;
  canManageCourse: boolean;
}

export function canEditCourseMeta(
  user: AuthenticatedUser,
  context: CourseMetaEditContext,
): boolean {
  if (!context.courseExists) return false;
  if (user.role === "admin") return true;
  if (user.role === "teacher") {
    return context.isTeacherOfCourse && context.canManageCourse;
  }
  return false;
}
