"use server";

// Server action: estudiante entrega una tarea. Recibe FormData
// (no JSON) porque uno de los tipos es file_upload con un File
// nativo de la web platform. Server actions en Next.js soportan
// FormData directamente.
//
// El campo `kind` discrimina file_upload vs essay y selecciona la
// validacion + service correspondiente. Pattern thin: extraer
// fields, validar con Zod, llamar service, convertir errores a
// ActionError serializable antes de retornar.

import { profileRepository } from "@/modules/auth/data/profile.repository";
import { submissionService } from "@/modules/assignments/services/submission.service";
import {
  submitFileSchema,
  submitEssaySchema,
} from "@/modules/assignments/validations";
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

export async function submitAssignmentAction(
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
              "Tu sesión expiró. Vuelve a iniciar.",
            ),
          ),
        );
      }

      const kind = formData.get("kind");
      const assignmentId = formData.get("assignmentId");

      if (kind === "file_upload") {
        const parsed = submitFileSchema.safeParse({ assignmentId });
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
        const result = await submissionService.submitFileAssignment({
          user,
          assignmentId: parsed.data.assignmentId,
          file,
        });
        if (!result.ok) return err(toActionError(result.error));
        return ok(undefined);
      }

      if (kind === "essay") {
        const parsed = submitEssaySchema.safeParse({
          assignmentId,
          essayText: formData.get("essayText"),
        });
        if (!parsed.success) {
          return err(
            validationErrorToActionError(parsed.error, "Datos inválidos"),
          );
        }
        const result = await submissionService.submitEssayAssignment({
          user,
          assignmentId: parsed.data.assignmentId,
          essayText: parsed.data.essayText,
        });
        if (!result.ok) return err(toActionError(result.error));
        return ok(undefined);
      }

      return err(
        toActionError(
          new ValidationError(
            ErrorCodes.VALIDATION_FAILED,
            "Tipo de entrega inválido.",
          ),
        ),
      );
    });
  } catch (e) {
    logger.error("submitAssignmentAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
