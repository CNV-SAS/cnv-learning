// Policy: el usuario puede emitir un anuncio scope='course' en
// este curso.
//
// Reglas:
//   - teacher con asignacion al curso: SI (RLS valida via
//     is_course_teacher en el INSERT con check).
//   - admin: SI (RLS "Admins manage announcements" cubre el INSERT).
//   - student: NO.
//
// Context: el caller pre-resuelve isTeacherOfCourse via repo o
// helper (no lo metemos en la policy para mantenerla sync + pura).

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface CourseAnnouncementContext {
  courseExists: boolean;
  isTeacherOfCourse: boolean;
}

export function canEmitCourseAnnouncement(
  user: AuthenticatedUser,
  context: CourseAnnouncementContext,
): boolean {
  if (!context.courseExists) return false;
  if (user.role === "admin") return true;
  if (user.role === "teacher") return context.isTeacherOfCourse;
  return false;
}
