// Policy: el usuario puede descargar el PDF de este certificado.
//
// Reglas:
//   - student: SI si es propietario (cert.user_id === user.id).
//   - admin: SI siempre.
//   - teacher: NO en MVP (los certificados son del student, el
//     teacher no necesita acceso al PDF). Si en v2 entra "teacher
//     ve PDF de sus students", ampliamos.
//
// El status revoked NO bloquea la descarga: consideracion del plan
// del Bloque 12, el PDF revocado lleva watermark "REVOCADO" y el
// QR sigue apuntando a /verify que muestra el estado actual.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface ViewCertificatePdfContext {
  certificateExists: boolean;
  ownerId: string;
}

export function canViewCertificatePdf(
  user: AuthenticatedUser,
  context: ViewCertificatePdfContext,
): boolean {
  if (!context.certificateExists) return false;
  if (user.role === "admin") return true;
  if (user.role === "student") return context.ownerId === user.id;
  return false;
}
