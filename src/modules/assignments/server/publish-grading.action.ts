"use server";

// Server action: docente publica calificacion de una entrega.
// Input JSON (sin uploads), patron thin: Zod parse + auth +
// service + Result<void, ActionError>.

import { profileRepository } from "@/modules/auth/data/profile.repository";
import { gradingService } from "@/modules/assignments/services/grading.service";
import { publishGradingSchema } from "@/modules/assignments/validations";
import { ok, err, type Result } from "@/lib/utils/result";
import {
  type ActionError,
  toActionError,
  validationErrorToActionError,
  unexpectedActionError,
} from "@/lib/utils/action-error";
import { AuthenticationError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";

export async function publishGradingAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = publishGradingSchema.safeParse(input);
      if (!parsed.success) {
        return err(
          validationErrorToActionError(parsed.error, "Datos inválidos"),
        );
      }

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

      const result = await gradingService.publishGrading({
        user,
        submissionId: parsed.data.submissionId,
        finalGrade: parsed.data.finalGrade,
        feedback: parsed.data.feedback,
      });
      if (!result.ok) return err(toActionError(result.error));
      return ok(undefined);
    });
  } catch (e) {
    logger.error("publishGradingAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
