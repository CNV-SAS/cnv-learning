// Policy: si la emision del certificado esta permitida para este
// estudiante y curso.
//
// Bloque post-23: refactor para el modelo de constancias de
// actualizacion. La policy solo evalua "esta el curso al 100%". El
// guard de duplicados (1 sola completion valida por user/course) lo
// delega al partial unique index del schema (migracion 0036) +
// findValidCompletionByUserAndCourse en el service que decide kind
// (completion vs update).
//
// Pre-23 la policy chequeaba hasExistingCertificate para bloquear
// re-emisiones; ese check ya no tiene sentido porque queremos
// permitir constancias de actualizacion sobre un mismo (user, course).
//
// El issue es disparado por el sistema (progressService al alcanzar
// 100%), no por un user con accion explicita. Por eso esta policy
// no toma AuthenticatedUser.

export interface IssueCertificateContext {
  isCourseComplete: boolean;
}

export function canIssueCertificate(
  context: IssueCertificateContext,
): boolean {
  return context.isCourseComplete;
}
