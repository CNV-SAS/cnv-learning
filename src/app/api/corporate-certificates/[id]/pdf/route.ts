// GET /api/corporate-certificates/[id]/pdf
//
// Stream del PDF del certificado corporativo "Profesional Conectado
// CNV" on-demand. Patron thin (ARCHITECTURE regla 2): valida id +
// auth + policy + lookup + render + Response. Mismo flow que el
// route handler de la Constancia de Finalizacion (B12).
//
// Auth: admin client en el repo (corporate_certificates.findById
// usa createAdminClient porque la pagina /verify-corporate publica
// tambien lo usa). canViewCorporateCertificatePdf valida que el
// caller sea admin o el dueño del cert.
//
// Filename: profesional-conectado-cnv-{certIdShort}.pdf
//
// Status revoked NO bloquea la descarga (mismo criterio que la
// Constancia: PDF con watermark "REVOCADO", QR resolviendo al
// estado actual via /verify-corporate).

import { NextResponse } from "next/server";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { corporateCertificateRepository } from "@/modules/certificates/data";
import { canViewCorporateCertificatePdf } from "@/modules/certificates/policies";
import { renderCorporateCertificatePdf } from "@/lib/pdf";
import { errorResponse, unexpectedResponse } from "@/lib/api/errors";
import { UUID_FORMAT } from "@/lib/utils/uuid";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";
import {
  AuthenticationError,
  AuthorizationError,
  InfrastructureError,
  NotFoundError,
  ValidationError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const { id: rawId } = await context.params;
      if (!UUID_FORMAT.test(rawId)) {
        return errorResponse(
          new ValidationError(
            ErrorCodes.VALIDATION_FAILED,
            "ID de certificado inválido.",
          ),
        );
      }

      const user = await profileRepository.getCurrentUser();
      if (!user) {
        return errorResponse(
          new AuthenticationError(
            ErrorCodes.AUTH_SESSION_EXPIRED,
            "Tu sesión expiró.",
          ),
        );
      }

      const certificate =
        await corporateCertificateRepository.findById(rawId);
      if (!certificate) {
        return errorResponse(
          new NotFoundError(
            ErrorCodes.CORPORATE_CERTIFICATE_NOT_FOUND,
            "Certificado corporativo no encontrado.",
          ),
        );
      }

      const allowed = canViewCorporateCertificatePdf(user, {
        certificateExists: true,
        ownerId: certificate.user_id,
      });
      if (!allowed) {
        return errorResponse(
          new AuthorizationError(
            ErrorCodes.AUTHZ_CANNOT_VIEW_CORPORATE_CERTIFICATE_PDF,
            "No puedes descargar este certificado.",
          ),
        );
      }

      // Profile del dueño para el nombre que va en el PDF. Si no
      // resuelve (FK cascade dejaria esto null solo en caso edge de
      // borrado parcial), respondemos 500 para visibilidad.
      const studentProfile = await profileRepository.findById(
        certificate.user_id,
      );
      if (!studentProfile) {
        return errorResponse(
          new InfrastructureError(
            ErrorCodes.DATABASE_ERROR,
            "Datos del certificado incompletos.",
          ),
        );
      }

      // 22.12 defensive logging: rodear renderCorporateCertificatePdf
      // con su propio try/catch para que errores de I/O (template
      // missing, font no encontrada) salgan en logs con clave clara
      // en lugar de caer en el catch global como "unexpected throw".
      // El cliente sigue recibiendo el mismo errorResponse (no leak),
      // pero ops puede diagnosticar desde Vercel logs.
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await renderCorporateCertificatePdf({
          certificateId: certificate.id,
          studentName: studentProfile.full_name,
          issuedAtIso: certificate.issued_at,
          hash: certificate.hash,
          isRevoked: certificate.status === "revoked",
        });
      } catch (e) {
        const code = (e as NodeJS.ErrnoException)?.code ?? null;
        logger.error("renderCorporateCertificatePdf failed", {
          certificateId: certificate.id,
          errorCode: code,
          errorMessage: e instanceof Error ? e.message : String(e),
        });
        return errorResponse(
          new InfrastructureError(
            ErrorCodes.DATABASE_ERROR,
            "No fue posible generar el PDF. Reintenta o contacta a soporte.",
          ),
        );
      }

      const filename = `profesional-conectado-cnv-${certificate.id.slice(0, 8)}.pdf`;

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    });
  } catch (e) {
    logger.error("GET /api/corporate-certificates/[id]/pdf unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return unexpectedResponse();
  }
}
