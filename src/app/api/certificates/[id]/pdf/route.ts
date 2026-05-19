// GET /api/certificates/[id]/pdf
//
// Stream del PDF del certificado on-demand. Patron thin (ARCHITECTURE
// regla 2): valida id + auth + policy + lookup + render + Response.
//
// Auth: server client + RLS (student propio o admin todos via
// "Admins manage"). canViewCertificatePdf adicional para early fail
// con 403 antes de renderizar.
//
// Filename pattern (consideracion A del plan B12):
//   certificado-{courseSlug}-{certIdShort}.pdf
//
// Content-Disposition attachment para forzar download del browser
// (vs view inline). Si el viewer abre el PDF en visor del browser,
// el browser respeta el filename para guardado posterior.
//
// Status revoked NO bloquea la descarga (policy del Bloque 12 +
// canViewCertificatePdf no chequea status). El PDF lleva watermark
// "REVOCADO" y el QR sigue apuntando a /verify para verificacion
// publica del estado actual.

import { NextResponse } from "next/server";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { certificateRepository } from "@/modules/certificates/data";
import { canViewCertificatePdf } from "@/modules/certificates/policies";
import { courseRepository } from "@/modules/courses/data";
import { renderCertificatePdf } from "@/lib/pdf";
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

      const certificate = await certificateRepository.findById(rawId);
      if (!certificate) {
        return errorResponse(
          new NotFoundError(
            ErrorCodes.CERTIFICATE_NOT_FOUND,
            "Certificado no encontrado.",
          ),
        );
      }

      const allowed = canViewCertificatePdf(user, {
        certificateExists: true,
        ownerId: certificate.user_id,
      });
      if (!allowed) {
        return errorResponse(
          new AuthorizationError(
            ErrorCodes.AUTHZ_CANNOT_VIEW_CERTIFICATE_PDF,
            "No puedes descargar este certificado.",
          ),
        );
      }

      // Resolver studentName + courseName/slug. Profile via repo
      // (RLS valida; admin ve todos, student ve propio). Course
      // via repo (RLS lets student see enrolled, admin see all).
      const [studentProfile, courseRow] = await Promise.all([
        profileRepository.findById(certificate.user_id),
        courseRepository.findById(certificate.course_id),
      ]);

      if (!studentProfile || !courseRow) {
        // Caso edge: cert existe pero profile o course no
        // accesibles (RLS rechaza). No deberia pasar para owner
        // o admin; loguear y fail 500 para visibilidad.
        return errorResponse(
          new InfrastructureError(
            ErrorCodes.DATABASE_ERROR,
            "Datos del certificado incompletos.",
          ),
        );
      }

      const pdfBuffer = await renderCertificatePdf({
        certificateId: certificate.id,
        studentName: studentProfile.full_name,
        courseName: courseRow.title,
        issuedAtIso: certificate.issued_at,
        hash: certificate.hash,
        isRevoked: certificate.status === "revoked",
      });

      const filename = `certificado-${courseRow.slug}-${certificate.id.slice(0, 8)}.pdf`;

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
    logger.error("GET /api/certificates/[id]/pdf unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return unexpectedResponse();
  }
}
