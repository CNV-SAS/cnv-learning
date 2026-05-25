// Policy: el usuario puede subir/borrar certificados academicos
// (Bloque 22.2). Solo admin. RLS de la tabla cubre el escudo final,
// la policy filtra antes para fail-early con error claro.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canManageAcademicCertificate(
  user: AuthenticatedUser,
): boolean {
  return user.role === "admin";
}
