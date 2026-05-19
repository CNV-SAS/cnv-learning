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
//   - Delivery: notification in-app (kind='certificate_issued') +
//     email (Bloque 12.9). Fault-tolerant: si falla el delivery
//     el certificado ya esta persistido y auditado.
//
// revokeCertificate:
//   - Caller (admin desde /admin/certificates) pasa user + cert id +
//     reason validados por Zod.
//   - Policy canRevokeCertificate (admin role + cert existe + no
//     ya revoked).
//   - Repo revoke via admin client.
//   - Audit log 'certificate.revoked' con reason en metadata.
//   - Delivery: notification + email (kind='certificate_revoked')
//     al estudiante con motivo. Fault-tolerant igual que issue.

import { certificateRepository } from "@/modules/certificates/data";
import {
  canIssueCertificate,
  canRevokeCertificate,
} from "@/modules/certificates/policies";
import { auditRepository } from "@/modules/audit/data";
import { notificationRepository } from "@/modules/notifications/data";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import {
  sendCertificateIssuedEmail,
  sendCertificateRevokedEmail,
} from "@/lib/email";
import { computeCertificateHash } from "@/lib/utils/hash";
import { logger } from "@/core/logger/logger";
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

// Resuelve student + course y dispara notification + email al
// estudiante. Fault-tolerant en multiples niveles:
//   - Si lookup de profile o course falla -> log warn, return
//     (cert ya persistido + audit, delivery se intenta manualmente).
//   - Si createBulk falla -> log warn, email igual se intenta.
//   - sendEmail* ya es no-throw (lib/email/resend.ts).
// El caller (service.issueCertificate / revokeCertificate) llama
// este helper despues del audit, sin throw propagado.
async function deliverCertificateNotification(params: {
  certificate: Certificate;
  kind: "issued" | "revoked";
  reason?: string;
}): Promise<void> {
  const { certificate, kind } = params;

  const [studentProfile, courseRow] = await Promise.all([
    profileRepository.findById(certificate.user_id),
    courseRepository.findById(certificate.course_id),
  ]);

  if (!studentProfile || !courseRow) {
    logger.warn(
      "Certificate delivery skip: profile or course not accessible",
      {
        certificateId: certificate.id,
        kind,
        hasProfile: studentProfile !== null,
        hasCourse: courseRow !== null,
      },
    );
    return;
  }

  const isIssued = kind === "issued";
  const notificationTitle = isIssued
    ? `Tu certificado de ${courseRow.title} está listo`
    : `Tu certificado de ${courseRow.title} fue revocado`;
  const notificationBody = isIssued
    ? "Puedes descargar el PDF desde tu perfil."
    : `Motivo: ${params.reason ?? "sin detalle"}`;
  const notificationLink = isIssued
    ? "/profile"
    : `/verify/${certificate.id}`;

  try {
    await notificationRepository.createBulk({
      userIds: [studentProfile.id],
      kind: isIssued ? "certificate_issued" : "certificate_revoked",
      title: notificationTitle,
      body: notificationBody,
      link: notificationLink,
      metadata: {
        certificateId: certificate.id,
        courseId: certificate.course_id,
        ...(params.reason ? { reason: params.reason } : {}),
      },
    });
  } catch (e) {
    logger.warn("Certificate notification in-app failed (non-blocking)", {
      certificateId: certificate.id,
      kind,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  try {
    if (isIssued) {
      await sendCertificateIssuedEmail({
        recipientEmail: studentProfile.email,
        studentName: studentProfile.full_name,
        courseTitle: courseRow.title,
        certificateId: certificate.id,
      });
    } else {
      await sendCertificateRevokedEmail({
        recipientEmail: studentProfile.email,
        studentName: studentProfile.full_name,
        courseTitle: courseRow.title,
        certificateId: certificate.id,
        reason: params.reason ?? "sin detalle",
      });
    }
  } catch (e) {
    logger.warn("Certificate email failed (non-blocking)", {
      certificateId: certificate.id,
      kind,
      error: e instanceof Error ? e.message : String(e),
    });
  }
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

    // Delivery fault-tolerant. Si falla, cert + audit ya estan ok.
    try {
      await deliverCertificateNotification({
        certificate,
        kind: "issued",
      });
    } catch (e) {
      logger.warn(
        "Certificate issued delivery threw unexpected (non-blocking)",
        {
          certificateId: certificate.id,
          error: e instanceof Error ? e.message : String(e),
        },
      );
    }

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

    try {
      await deliverCertificateNotification({
        certificate: revoked,
        kind: "revoked",
        reason: params.reason,
      });
    } catch (e) {
      logger.warn(
        "Certificate revoked delivery threw unexpected (non-blocking)",
        {
          certificateId: revoked.id,
          error: e instanceof Error ? e.message : String(e),
        },
      );
    }

    return ok(revoked);
  },
};
