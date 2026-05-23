"use server";

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { moduleRepository } from "@/modules/courses/data";
import { courseContentEditorService } from "@/modules/courses/services/course-content-editor.service";
import { updateModuleSchema } from "@/modules/courses/validations";
import { ok, err, type Result } from "@/lib/utils/result";
import {
  type ActionError,
  toActionError,
  validationErrorToActionError,
  unexpectedActionError,
} from "@/lib/utils/action-error";
import { AuthenticationError, NotFoundError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";

export async function updateModuleAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = updateModuleSchema.safeParse(input);
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

      // Pre-fetch para conocer course_id (necesario para revalidatePath
      // del editor del curso correcto).
      const existing = await moduleRepository.findById(parsed.data.moduleId);
      if (!existing) {
        return err(
          toActionError(
            new NotFoundError(
              ErrorCodes.MODULE_NOT_FOUND,
              "Módulo no encontrado.",
            ),
          ),
        );
      }

      const result = await courseContentEditorService.updateModule({
        user,
        moduleId: parsed.data.moduleId,
        title: parsed.data.title,
        description: parsed.data.description,
        weight: parsed.data.weight,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(`/teacher/courses/${existing.course_id}/edit`);

      return ok(undefined);
    });
  } catch (e) {
    logger.error("updateModuleAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
