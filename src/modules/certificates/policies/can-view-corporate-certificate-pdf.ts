// Policy: el usuario puede descargar el PDF del certificado
// corporativo "Profesional Conectado CNV" (Bloque 22.4).
//
// Reglas:
//   - student: SI si es propietario (cert.user_id === user.id).
//   - admin: SI siempre.
//   - teacher: NO en MVP (el corporate cert no involucra al docente).
//
// El status revoked NO bloquea la descarga: el PDF revocado lleva
// marca visual (overlay watermark) y el QR sigue apuntando a
// /verify-corporate que muestra el estado actual. Mismo patron que
// canViewCertificatePdf (Bloque 12).

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface ViewCorporateCertificatePdfContext {
  certificateExists: boolean;
  ownerId: string;
}

export function canViewCorporateCertificatePdf(
  user: AuthenticatedUser,
  context: ViewCorporateCertificatePdfContext,
): boolean {
  if (!context.certificateExists) return false;
  if (user.role === "admin") return true;
  if (user.role === "student") return context.ownerId === user.id;
  return false;
}
