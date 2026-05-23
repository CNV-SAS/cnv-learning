"use server";

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { moduleRepository } from "@/modules/courses/data";
import { assignmentRepository } from "@/modules/assignments/data";
import { courseContentEditorService } from "@/modules/courses/services/course-content-editor.service";
import { deleteAssignmentSchema } from "@/modules/courses/validations";
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

export async function deleteAssignmentAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = deleteAssignmentSchema.safeParse(input);
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

      const existing = await assignmentRepository.findById(
        parsed.data.assignmentId,
      );
      if (!existing) {
        return err(
          toActionError(
            new NotFoundError(
              ErrorCodes.ASSIGNMENT_NOT_FOUND,
              "Tarea no encontrada.",
            ),
          ),
        );
      }
      const module = await moduleRepository.findById(existing.module_id);
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

      const result = await courseContentEditorService.deleteAssignment({
        user,
        assignmentId: parsed.data.assignmentId,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(
        `/teacher/courses/${module.course_id}/edit/modules/${existing.module_id}`,
      );

      return ok(undefined);
    });
  } catch (e) {
    logger.error("deleteAssignmentAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
