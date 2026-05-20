// Policy: cualquier user autenticado edita su propio perfil
// (full_name, avatar_url, bio, professional_license, institution,
// specialization). Trivial pero explicita: si en v2 se restringe
// (por ejemplo, suspendidos no editan), el cambio entra aqui sin
// dispersar role checks.
//
// El service mutates solo `profiles WHERE id = actor.id`; no
// recibe targetUserId. Esta policy es defense-in-depth para ese
// invariante.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canEditOwnProfile(user: AuthenticatedUser): boolean {
  // Los 3 roles autenticados pueden editar su propio profile.
  // Listado exhaustivo del enum user_role (Bloque 1) para detectar
  // si en v2 entra un rol nuevo y olvidamos actualizar.
  return (
    user.role === "student" ||
    user.role === "teacher" ||
    user.role === "admin"
  );
}
