// Policy: el usuario puede emitir el certificado corporativo
// "Profesional Conectado CNV" (Bloque 22.2).
//
// Reglas:
//   - admin: SI.
//   - resto: NO.
//   - target debe ser role='student' (no se emite a teachers/admins).
//
// El context.targetIsStudent lo pre-resuelve el caller via
// profileRepository.findById(targetUserId) y comparando role.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface IssueCorporateCertificateContext {
  targetIsStudent: boolean;
}

export function canIssueCorporateCertificate(
  user: AuthenticatedUser,
  context: IssueCorporateCertificateContext,
): boolean {
  if (user.role !== "admin") return false;
  return context.targetIsStudent;
}
