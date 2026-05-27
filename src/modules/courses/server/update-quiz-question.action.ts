"use server";

// Server action: actualizar pregunta + reemplazar opciones del quiz
// (Bloque 23.2.b). Patron thin. El service hace replaceOptions
// (delete + insert) para sustituir el set completo.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { quizEditorService } from "@/modules/courses/services/quiz-editor.service";
import { updateQuizQuestionSchema } from "@/modules/courses/validations";
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

export async function updateQuizQuestionAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = updateQuizQuestionSchema.safeParse(input);
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
              "Tu sesión expiró.",
            ),
          ),
        );
      }

      const result = await quizEditorService.updateQuestion({
        user,
        questionId: parsed.data.questionId,
        prompt: parsed.data.prompt,
        points: parsed.data.points,
        options: parsed.data.options.map((o) => ({
          label: o.label,
          is_correct: o.isCorrect,
          position: o.position,
        })),
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath("/teacher", "layout");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("updateQuizQuestionAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
