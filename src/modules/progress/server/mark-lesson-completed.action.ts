"use server";

// Server action: marcar leccion como completada. Primera write
// action de dominio del MVP (fuera de auth).
//
// Flow:
//   1. Validar input (lessonId formato UUID).
//   2. Resolver user de sesion (defensa: proxy ya bloqueo no-auth).
//   3. Fetch lesson + policy canViewLesson (RLS hace el filtrado
//      real, la policy da early failure si lesson no es accesible).
//   4. progressService.markLessonCompleted (upsert idempotente).
//   5. Return ok(undefined) o err(ActionError) sin lanzar.
//
// Patron heredado de auth actions: try-catch top-level con
// withContext + requestId, errores convertidos a ActionError
// serializable antes de retornar.

import { profileRepository } from "@/modules/auth/data/profile.repository";
import { lessonRepository } from "@/modules/courses/data";
import { canViewLesson } from "@/modules/courses/policies";
import { progressService } from "@/modules/progress/services/progress.service";
import { markLessonCompletedSchema } from "@/modules/progress/validations";
import { ok, err, type Result } from "@/lib/utils/result";
import {
  type ActionError,
  toActionError,
  validationErrorToActionError,
  unexpectedActionError,
} from "@/lib/utils/action-error";
import { AuthenticationError, AuthorizationError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";

export async function markLessonCompletedAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = markLessonCompletedSchema.safeParse(input);
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

      const lesson = await lessonRepository.findById(parsed.data.lessonId);
      if (
        !canViewLesson(user, { lessonExists: lesson !== null }) ||
        !lesson
      ) {
        return err(
          toActionError(
            new AuthorizationError(
              ErrorCodes.AUTHZ_CANNOT_MARK_LESSON,
              "No puedes marcar esta lección.",
            ),
          ),
        );
      }

      await progressService.markLessonCompleted(user.id, lesson.id);

      return ok(undefined);
    });
  } catch (e) {
    logger.error("markLessonCompletedAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
