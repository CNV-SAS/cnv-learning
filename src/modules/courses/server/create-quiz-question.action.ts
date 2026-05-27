"use server";

// Server action: crear pregunta de quiz + opciones (Bloque 23.2.b).
// Patron thin. Policy + audit + atomicidad en quizEditorService.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { quizEditorService } from "@/modules/courses/services/quiz-editor.service";
import { createQuizQuestionSchema } from "@/modules/courses/validations";
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

export interface CreateQuizQuestionResult {
  questionId: string;
}

export async function createQuizQuestionAction(
  input: unknown,
): Promise<Result<CreateQuizQuestionResult, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = createQuizQuestionSchema.safeParse(input);
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

      const result = await quizEditorService.createQuestion({
        user,
        assignmentId: parsed.data.assignmentId,
        prompt: parsed.data.prompt,
        points: parsed.data.points,
        options: parsed.data.options.map((o) => ({
          label: o.label,
          is_correct: o.isCorrect,
          position: o.position,
        })),
      });
      if (!result.ok) return err(toActionError(result.error));

      // El path exacto del editor de quiz se conoce hasta 23.2.c;
      // revalidar la raiz del editor de modulos cubre cualquier
      // ruta dentro del editor.
      revalidatePath("/teacher", "layout");

      return ok({ questionId: result.value.question.id });
    });
  } catch (e) {
    logger.error("createQuizQuestionAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
