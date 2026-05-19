// Service: orquesta emision y revocacion de certificados.
// ARCHITECTURE.md regla 2 (action thin -> service; logica aqui).
//
// issueCertificate:
//   - Caller (progressService al cruzar 100%) pasa isCourseComplete
//     como contrato de pre-condicion. El service confia en el caller
//     para esa parte (es operacion de sistema, no de user) pero
//     verifica con su propia query que no haya un cert previo
//     (defensa contra dobles emisiones por race conditions).
//   - Compute hash via lib/utils/hash con issued_at en ISO UTC para
//     reproducibilidad.
//   - Insert via admin client (RLS bloquea INSERT por user).
//   - Audit log 'certificate.issued' (regla 8 ARCHITECTURE).
//
// revokeCertificate:
//   - Caller (admin desde /admin/certificates) pasa user + cert id +
//     reason validados por Zod.
//   - Policy canRevokeCertificate (admin role + cert existe + no
//     ya revoked).
//   - Repo revoke via admin client.
//   - Audit log 'certificate.revoked' con reason en metadata.
//
// Notifications + emails de issued/revoked se manejan en sub-bloque
// 12.9 (wire-up al final del service o handler dedicado).

import { certificateRepository } from "@/modules/certificates/data";
import {
  canIssueCertificate,
  canRevokeCertificate,
} from "@/modules/certificates/policies";
import { auditRepository } from "@/modules/audit/data";
import { computeCertificateHash } from "@/lib/utils/hash";
import {
  type AppError,
  AuthorizationError,
  DomainError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { Certificate } from "../types";

const CURRENT_TEMPLATE_VERSION = "v1";

interface IssueCertificateParams {
  // userId y courseId resueltos por el caller (progressService).
  userId: string;
  courseId: string;
  // Confianza del caller: true cuando el caller verifico 100% via
  // progressService.getCourseSummary. El service no re-verifica
  // progreso porque seria circular dep con progress module.
  isCourseComplete: boolean;
}

interface RevokeCertificateParams {
  user: AuthenticatedUser;
  certificateId: string;
  reason: string;
}

export const certificateService = {
  async issueCertificate(
    params: IssueCertificateParams,
  ): Promise<Result<Certificate, AppError>> {
    const existing = await certificateRepository.findByUserAndCourse(
      params.userId,
      params.courseId,
    );

    const allowed = canIssueCertificate({
      isCourseComplete: params.isCourseComplete,
      hasExistingCertificate: existing !== null,
    });
    if (!allowed) {
      if (existing) {
        return err(
          new DomainError(
            ErrorCodes.CERTIFICATE_ALREADY_ISSUED,
            "Ya existe un certificado para este estudiante y curso.",
          ),
        );
      }
      return err(
        new DomainError(
          ErrorCodes.CERTIFICATE_NOT_ELIGIBLE,
          "El curso no esta 100% completado.",
        ),
      );
    }

    const issuedAt = new Date();
    const hash = computeCertificateHash({
      userId: params.userId,
      courseId: params.courseId,
      issuedAt,
      templateVersion: CURRENT_TEMPLATE_VERSION,
    });

    const certificate = await certificateRepository.create({
      user_id: params.userId,
      course_id: params.courseId,
      issued_at: issuedAt.toISOString(),
      hash,
      template_version: CURRENT_TEMPLATE_VERSION,
    });

    // Audit (regla 8). Fault-tolerant per audit repo (no throw).
    // actor_id es null porque el issue es operacion de sistema
    // (disparado por completion del student, no por accion de admin).
    await auditRepository.record({
      event: "certificate.issued",
      resourceType: "certificate",
      resourceId: certificate.id,
      actorId: null,
      actorEmail: null,
      metadata: {
        userId: params.userId,
        courseId: params.courseId,
        templateVersion: CURRENT_TEMPLATE_VERSION,
        hashPrefix: hash.slice(0, 16),
      },
    });

    return ok(certificate);
  },

  async revokeCertificate(
    params: RevokeCertificateParams,
  ): Promise<Result<Certificate, AppError>> {
    const existing = await certificateRepository.findById(
      params.certificateId,
    );
    if (!existing) {
      return err(
        new NotFoundError(
          ErrorCodes.CERTIFICATE_NOT_FOUND,
          "Certificado no encontrado.",
        ),
      );
    }

    const allowed = canRevokeCertificate(params.user, {
      certificateExists: true,
      alreadyRevoked: existing.status === "revoked",
    });
    if (!allowed) {
      if (existing.status === "revoked") {
        return err(
          new DomainError(
            ErrorCodes.CERTIFICATE_REVOKED,
            "Este certificado ya esta revocado.",
          ),
        );
      }
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_REVOKE_CERTIFICATE,
          "No puedes revocar este certificado.",
        ),
      );
    }

    const revoked = await certificateRepository.revoke({
      id: params.certificateId,
      revokedBy: params.user.id,
      reason: params.reason,
    });

    await auditRepository.record({
      event: "certificate.revoked",
      resourceType: "certificate",
      resourceId: revoked.id,
      actorId: params.user.id,
      actorEmail: params.user.email,
      metadata: {
        userId: revoked.user_id,
        courseId: revoked.course_id,
        reason: params.reason,
      },
    });

    return ok(revoked);
  },
};
