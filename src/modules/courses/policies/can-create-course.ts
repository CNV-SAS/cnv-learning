// Policy: solo admin puede crear cursos (decision D3 plan B23).
//
// El flag can_manage_course en course_teachers solo habilita
// editar metadatos de un curso EXISTENTE, no crear cursos nuevos.
// Mismo patron que canManageUsers.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canCreateCourse(user: AuthenticatedUser): boolean {
  return user.role === "admin";
}
