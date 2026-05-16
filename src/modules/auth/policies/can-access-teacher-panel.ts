// Policy: el usuario puede acceder al panel docente (/teacher/*).
// Teacher o admin (admin entra para soporte, QA, demostraciones; patron
// comun en LMS).

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canAccessTeacherPanel(user: AuthenticatedUser): boolean {
  return user.role === "teacher" || user.role === "admin";
}
