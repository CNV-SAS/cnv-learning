// Hash SHA-256 utilities. Usado por certificateService.issueCertificate
// para computar el hash de integridad institucional documentado en la
// migracion 0012_certificates.sql:
//
//   hash = SHA-256(user_id || course_id || issued_at || template_version)
//
// El issued_at se serializa a ISO UTC string (toISOString()) para que el
// hash sea reproducible: dado el mismo input, el output siempre coincide
// independientemente del runtime, zona horaria del servidor, o subset
// de campos. La concatenacion usa "|" como separador para que valores
// con caracteres especiales no colisionen (ej. "abc" + "def" vs "ab" +
// "cdef").
//
// Sin crypto-grade signature (no es certificado X.509). Es defensa
// institucional: cualquiera que tenga el id + ground truth de los
// campos puede recomputar el hash y verificar integridad.

import { createHash } from "node:crypto";

export interface CertificateHashInput {
  userId: string;
  courseId: string;
  issuedAt: Date;
  templateVersion: string;
}

export function computeCertificateHash(
  input: CertificateHashInput,
): string {
  const payload = [
    input.userId,
    input.courseId,
    input.issuedAt.toISOString(),
    input.templateVersion,
  ].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

// Hash del certificado corporativo (Bloque 22.2). No tiene course_id
// (corporate cert no se asocia a curso). Mismo separador y algoritmo
// para preservar el patron reproducible:
//   hash = SHA-256(user_id || issued_at || template_version)
export interface CorporateCertificateHashInput {
  userId: string;
  issuedAt: Date;
  templateVersion: string;
}

export function computeCorporateCertificateHash(
  input: CorporateCertificateHashInput,
): string {
  const payload = [
    input.userId,
    input.issuedAt.toISOString(),
    input.templateVersion,
  ].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
