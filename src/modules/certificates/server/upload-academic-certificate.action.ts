"use server";

// Server action: admin sube el PDF del certificado academico
// (universidad mexicana) para un (student, curso). Recibe FormData
// porque incluye un File nativo; mismo patron que
// submitAssignmentAction.
//
// El service maneja MIME check, max size, anti-duplicado, upload al
// bucket y cleanup del blob si el insert falla. Sin audit log
// (decision del planning 22.2: upload externo no es evento critico).

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { academicCertificateService } from "@/modules/certificates/services";
import { uploadAcademicCertificateSchema } from "@/modules/certificates/validations";
import { ok, err, type Result } from "@/lib/utils/result";
import {
  type ActionError,
  toActionError,
  validationErrorToActionError,
  unexpectedActionError,
} from "@/lib/utils/action-error";
import { AuthenticationError, ValidationError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";

export async function uploadAcademicCertificateAction(
  formData: FormData,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const user = await profileRepository.getCurrentUser();
      if (!user) {
        return err(
          toActionError(
            new AuthenticationError(
              ErrorCodes.AUTH_SESSION_EXPIRED,
              "Tu sesión expiró.",
            ),
          ),
        );
      }

      const rawNotes = formData.get("notes");
      const parsed = uploadAcademicCertificateSchema.safeParse({
        userId: formData.get("userId"),
        courseId: formData.get("courseId"),
        notes:
          typeof rawNotes === "string" && rawNotes.trim().length > 0
            ? rawNotes
            : null,
      });
      if (!parsed.success) {
        return err(
          validationErrorToActionError(parsed.error, "Datos inválidos"),
        );
      }

      const file = formData.get("file");
      if (!(file instanceof File)) {
        return err(
          toActionError(
            new ValidationError(
              ErrorCodes.VALIDATION_FAILED,
              "Archivo requerido.",
            ),
          ),
        );
      }

      const result = await academicCertificateService.upload({
        actor: user,
        targetUserId: parsed.data.userId,
        courseId: parsed.data.courseId,
        file,
        notes: parsed.data.notes,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(`/admin/users/${parsed.data.userId}`);

      return ok(undefined);
    });
  } catch (e) {
    logger.error("uploadAcademicCertificateAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
