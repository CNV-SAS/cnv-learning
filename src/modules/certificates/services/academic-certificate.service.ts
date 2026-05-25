// Service de academic certificates (Bloque 22.2). Wrapping del
// flujo upload PDF + persistir row + signed URL para descarga.
//
// El upload del PDF ocurre desde el server action (admin) que
// recibe FormData con el File. El service:
//   1. Genera storage_path = "{userId}/{uuid}.pdf"
//   2. Sube el blob al bucket via admin client.
//   3. Inserta el row con metadata.
//   4. Cleanup del blob si el insert falla (orfan prevention).
//
// Sin audit log (decision del planning: upload externo, no evento
// critico).

import { academicCertificateRepository } from "@/modules/certificates/data";
import { canManageAcademicCertificate } from "@/modules/certificates/policies";
import {
  AppError,
  AuthorizationError,
  DomainError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { AcademicCertificate } from "@/modules/certificates/types";

const ALLOWED_MIME = "application/pdf";
const MAX_BYTES = 20 * 1024 * 1024;

export const academicCertificateService = {
  async upload(params: {
    actor: AuthenticatedUser;
    targetUserId: string;
    courseId: string;
    file: File;
    notes: string | null;
  }): Promise<Result<AcademicCertificate, AppError>> {
    if (!canManageAcademicCertificate(params.actor)) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_MANAGE_ACADEMIC_CERTIFICATES,
          "No puedes gestionar certificados académicos.",
        ),
      );
    }
    if (params.file.type !== ALLOWED_MIME) {
      return err(
        new DomainError(
          ErrorCodes.FILE_TYPE_INVALID,
          "Solo se permiten archivos PDF.",
        ),
      );
    }
    if (params.file.size > MAX_BYTES) {
      return err(
        new DomainError(
          ErrorCodes.FILE_TOO_LARGE,
          "El archivo supera los 20 MB.",
        ),
      );
    }

    // Anti-duplicado: un solo cert academico por (user, course).
    const existing =
      await academicCertificateRepository.findByUserAndCourse(
        params.targetUserId,
        params.courseId,
      );
    if (existing) {
      return err(
        new DomainError(
          ErrorCodes.ACADEMIC_CERTIFICATE_ALREADY_EXISTS,
          "Este alumno ya tiene un certificado académico para este curso. Elimínalo primero si quieres reemplazarlo.",
        ),
      );
    }

    const storagePath = `${params.targetUserId}/${crypto.randomUUID()}.pdf`;

    try {
      await academicCertificateRepository.uploadBlob(
        storagePath,
        params.file,
      );
    } catch (e) {
      return err(e as AppError);
    }

    try {
      const row = await academicCertificateRepository.create({
        user_id: params.targetUserId,
        course_id: params.courseId,
        storage_path: storagePath,
        uploaded_by: params.actor.id,
        notes: params.notes,
      });
      return ok(row);
    } catch (e) {
      // Cleanup del blob huerfano si el insert fallo despues del
      // upload (best-effort, no aborta el error original).
      await academicCertificateRepository.deleteBlob(storagePath);
      return err(e as AppError);
    }
  },

  async deleteById(params: {
    actor: AuthenticatedUser;
    id: string;
  }): Promise<Result<void, AppError>> {
    if (!canManageAcademicCertificate(params.actor)) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_MANAGE_ACADEMIC_CERTIFICATES,
          "No puedes gestionar certificados académicos.",
        ),
      );
    }
    const cert = await academicCertificateRepository.findById(params.id);
    if (!cert) {
      return err(
        new NotFoundError(
          ErrorCodes.ACADEMIC_CERTIFICATE_NOT_FOUND,
          "Certificado académico no encontrado.",
        ),
      );
    }
    await academicCertificateRepository.delete(params.id);
    await academicCertificateRepository.deleteBlob(cert.storage_path);
    return ok(undefined);
  },
};
