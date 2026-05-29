// Policy: teacher OR admin para /teacher/inbox y /teacher/grader/*.
//
// Smoke E2E post-ISSUE-3: el admin necesita acceder a la bandeja y
// al grader para revisar entregas como soporte / QA, sin pasar por
// /admin/teachers/[teacherId]. La RLS de submissions ya tiene la
// policy "Admins view all submissions" (migracion 0019), asi que
// un admin que entra ve TODAS las submissions pendientes del sistema
// (no vacia como afirmaba el comentario original, que era incorrecto).
// La vista cross-curso para admin es util durante el cohorte de
// prueba para diagnosticar entregas atascadas.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canAccessTeacherInbox(user: AuthenticatedUser): boolean {
  return user.role === "teacher" || user.role === "admin";
}
