// Policy: el usuario puede acceder al area de estudiante (/dashboard,
// /learn/*, /profile, /notifications).
//
// MVP: cualquier rol autenticado puede entrar. Teachers y admin ven el
// area en modo "preview" (util para QA, soporte, demostraciones).
//
// Existe como signature explicita aunque hoy sea trivial: si en futuro
// aparece un rol "guest" o "external", esta policy lo excluye sin
// refactor en los call sites.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canAccessStudentArea(user: AuthenticatedUser): boolean {
  return user.role === "student" || user.role === "teacher" || user.role === "admin";
}
