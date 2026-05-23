"use server";

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { moduleRepository } from "@/modules/courses/data";
import { courseContentEditorService } from "@/modules/courses/services/course-content-editor.service";
import { createLessonSchema } from "@/modules/courses/validations";
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

export interface CreateLessonResult {
  lessonId: string;
}

export async function createLessonAction(
  input: unknown,
): Promise<Result<CreateLessonResult, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = createLessonSchema.safeParse(input);
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

      const module = await moduleRepository.findById(parsed.data.moduleId);
      if (!module) {
        return err(
          toActionError(
            new NotFoundError(
              ErrorCodes.MODULE_NOT_FOUND,
              "Módulo no encontrado.",
            ),
          ),
        );
      }

      const result = await courseContentEditorService.createLesson({
        user,
        moduleId: parsed.data.moduleId,
        title: parsed.data.title,
        type: parsed.data.type,
        contentMarkdown: parsed.data.contentMarkdown,
        videoUrl: parsed.data.videoUrl,
        durationMinutes: parsed.data.durationMinutes,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(
        `/teacher/courses/${module.course_id}/edit/modules/${parsed.data.moduleId}`,
      );

      return ok({ lessonId: result.value.id });
    });
  } catch (e) {
    logger.error("createLessonAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
