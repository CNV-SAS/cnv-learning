// Service de corporate certificates "Profesional Conectado CNV"
// (Bloque 22.2). Issue + revoke manual por admin con audit log
// + hash SHA-256 + verificacion publica via /verify-corporate/[id].
//
// Mismo patron que certificateService (Constancia de Finalizacion):
//   - issue: anti-dup (un cert valido por user), policy, hash,
//     audit.
//   - revoke: anti-doble-revoke, policy, audit.
//
// El PDF se genera en 22.4 (route handler usando react-pdf + el
// template image). El service NO genera PDF.

import { corporateCertificateRepository } from "@/modules/certificates/data";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import {
  canIssueCorporateCertificate,
  canRevokeCorporateCertificate,
} from "@/modules/certificates/policies";
import { auditRepository } from "@/modules/audit/data";
import {
  AppError,
  AuthorizationError,
  DomainError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import { computeCorporateCertificateHash } from "@/lib/utils/hash";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { CorporateCertificate } from "@/modules/certificates/types";

const CURRENT_TEMPLATE_VERSION = "v1";

export const corporateCertificateService = {
  async issue(params: {
    actor: AuthenticatedUser;
    targetUserId: string;
  }): Promise<Result<CorporateCertificate, AppError>> {
    const target = await profileRepository.findById(params.targetUserId);
    if (!target) {
      return err(
        new NotFoundError(
          ErrorCodes.USER_NOT_FOUND,
          "Usuario no encontrado.",
        ),
      );
    }
    const allowed = canIssueCorporateCertificate(params.actor, {
      targetIsStudent: target.role === "student",
    });
    if (!allowed) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_ISSUE_CORPORATE_CERTIFICATE,
          "No puedes emitir certificados corporativos a este usuario.",
        ),
      );
    }

    // Anti-dup: un solo cert vigente por user.
    const existingValid =
      await corporateCertificateRepository.findValidByUser(
        params.targetUserId,
      );
    if (existingValid) {
      return err(
        new DomainError(
          ErrorCodes.CORPORATE_CERTIFICATE_ALREADY_ISSUED,
          "Este alumno ya tiene un certificado corporativo vigente. Revócalo primero si quieres emitir otro.",
        ),
      );
    }

    const issuedAt = new Date();
    const hash = computeCorporateCertificateHash({
      userId: params.targetUserId,
      issuedAt,
      templateVersion: CURRENT_TEMPLATE_VERSION,
    });

    const cert = await corporateCertificateRepository.create({
      user_id: params.targetUserId,
      hash,
      issued_at: issuedAt.toISOString(),
      issued_by: params.actor.id,
      template_version: CURRENT_TEMPLATE_VERSION,
    });

    // Audit (regla 8): evento de emision con snapshot del cert +
    // nombre del profesional para forensics.
    await auditRepository.record({
      event: "corporate_certificate.issued",
      resourceType: "corporate_certificate",
      resourceId: cert.id,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        snapshot: {
          id: cert.id,
          user_id: cert.user_id,
          hash: cert.hash,
          issued_at: cert.issued_at,
          template_version: cert.template_version,
        },
        professionalName: target.full_name,
        professionalEmail: target.email,
      },
    });

    return ok(cert);
  },

  async revoke(params: {
    actor: AuthenticatedUser;
    id: string;
    reason: string | null;
  }): Promise<Result<CorporateCertificate, AppError>> {
    const cert = await corporateCertificateRepository.findById(params.id);
    if (!cert) {
      return err(
        new NotFoundError(
          ErrorCodes.CORPORATE_CERTIFICATE_NOT_FOUND,
          "Certificado corporativo no encontrado.",
        ),
      );
    }
    const allowed = canRevokeCorporateCertificate(params.actor, {
      certificateExists: true,
      alreadyRevoked: cert.status === "revoked",
    });
    if (!allowed) {
      if (cert.status === "revoked") {
        return err(
          new DomainError(
            ErrorCodes.CORPORATE_CERTIFICATE_REVOKED,
            "Este certificado ya fue revocado.",
          ),
        );
      }
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_REVOKE_CORPORATE_CERTIFICATE,
          "No puedes revocar certificados corporativos.",
        ),
      );
    }

    const updated = await corporateCertificateRepository.revoke(
      params.id,
      params.actor.id,
      params.reason,
    );

    // Audit (regla 8): snapshot post-revoke + nombre del profesional
    // a partir de un fetch separado (cert.user_id ya lo conocemos).
    const target = await profileRepository.findById(cert.user_id);
    await auditRepository.record({
      event: "corporate_certificate.revoked",
      resourceType: "corporate_certificate",
      resourceId: updated.id,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        snapshot: {
          id: updated.id,
          user_id: updated.user_id,
          hash: updated.hash,
          issued_at: updated.issued_at,
          revoked_at: updated.revoked_at,
          revoked_reason: updated.revoked_reason,
          template_version: updated.template_version,
        },
        professionalName: target?.full_name ?? null,
      },
    });

    return ok(updated);
  },
};
