// Policy: si la emision del certificado esta permitida para este
// estudiante y curso.
//
// Reglas para MVP:
//   - El curso esta completado (100% progreso).
//   - No existe un certificado previo para el par (userId, courseId)
//     que NO este revocado. Si existe revoked, MVP no permite re-emit
//     (post-MVP: admin puede emitir uno nuevo, scope diferente).
//
// El issue es disparado por el sistema (progressService al alcanzar
// 100%), no por un user con accion explicita. Por eso esta policy
// no toma AuthenticatedUser: es una pre-check del service. Si
// quisieramos exponer "admin issue manualmente", esa funcion tendria
// su propia policy basada en rol.

export interface IssueCertificateContext {
  isCourseComplete: boolean;
  hasExistingCertificate: boolean;
}

export function canIssueCertificate(
  context: IssueCertificateContext,
): boolean {
  if (!context.isCourseComplete) return false;
  if (context.hasExistingCertificate) return false;
  return true;
}
