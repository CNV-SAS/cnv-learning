"use server";

// Server action: reordenar pregunta del quiz (Bloque 23.2.b). Patron
// thin. El service resuelve la pregunta vecina segun direction y
// llama al RPC swap_quiz_question_positions.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { quizEditorService } from "@/modules/courses/services/quiz-editor.service";
import { reorderQuizQuestionSchema } from "@/modules/courses/validations";
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

export async function reorderQuizQuestionAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = reorderQuizQuestionSchema.safeParse(input);
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

      const result = await quizEditorService.reorderQuestion({
        user,
        questionId: parsed.data.questionId,
        direction: parsed.data.direction,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath("/teacher", "layout");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("reorderQuizQuestionAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
