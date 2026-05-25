// Policy: el usuario puede revocar el certificado corporativo
// "Profesional Conectado CNV" (Bloque 22.2). Mismo shape que
// canRevokeCertificate (Constancia de Finalizacion).

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface RevokeCorporateCertificateContext {
  certificateExists: boolean;
  alreadyRevoked: boolean;
}

export function canRevokeCorporateCertificate(
  user: AuthenticatedUser,
  context: RevokeCorporateCertificateContext,
): boolean {
  if (user.role !== "admin") return false;
  if (!context.certificateExists) return false;
  if (context.alreadyRevoked) return false;
  return true;
}
