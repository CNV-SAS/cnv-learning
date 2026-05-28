"use server";

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { moduleRepository } from "@/modules/courses/data";
import { courseContentEditorService } from "@/modules/courses/services/course-content-editor.service";
import { createAssignmentSchema } from "@/modules/courses/validations";
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

export interface CreateAssignmentResult {
  assignmentId: string;
}

export async function createAssignmentAction(
  input: unknown,
): Promise<Result<CreateAssignmentResult, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = createAssignmentSchema.safeParse(input);
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

      const result = await courseContentEditorService.createAssignment({
        user,
        moduleId: parsed.data.moduleId,
        title: parsed.data.title,
        description: parsed.data.description,
        type: parsed.data.type,
        dueAt: parsed.data.dueAt,
        maxScore: parsed.data.maxScore,
        isRequired: parsed.data.isRequired,
        maxAttempts: parsed.data.maxAttempts,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(
        `/teacher/courses/${module.course_id}/edit/modules/${parsed.data.moduleId}`,
      );

      return ok({ assignmentId: result.value.id });
    });
  } catch (e) {
    logger.error("createAssignmentAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
