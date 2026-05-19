// Policy: el usuario puede revocar este certificado.
//
// Reglas:
//   - admin: SI (RLS "Admins manage certificates" cubre el UPDATE).
//   - resto: NO.
//
// Defense in depth: RLS es la fuente real; esta policy filtra
// antes para que el server action falle early con un error claro
// en lugar de pasar al repo y obtener un row no afectado.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface RevokeCertificateContext {
  certificateExists: boolean;
  alreadyRevoked: boolean;
}

export function canRevokeCertificate(
  user: AuthenticatedUser,
  context: RevokeCertificateContext,
): boolean {
  if (user.role !== "admin") return false;
  if (!context.certificateExists) return false;
  if (context.alreadyRevoked) return false;
  return true;
}
