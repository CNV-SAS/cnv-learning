"use server";

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseResourceRepository } from "@/modules/courses/data";
import { courseResourceService } from "@/modules/courses/services/course-resource.service";
import { updateCourseResourceSchema } from "@/modules/courses/validations";
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

export async function updateCourseResourceAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = updateCourseResourceSchema.safeParse(input);
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

      const existing = await courseResourceRepository.findById(
        parsed.data.resourceId,
      );
      if (!existing) {
        return err(
          toActionError(
            new NotFoundError(
              ErrorCodes.COURSE_RESOURCE_NOT_FOUND,
              "Recurso no encontrado.",
            ),
          ),
        );
      }

      const result = await courseResourceService.updateResource({
        user,
        resourceId: parsed.data.resourceId,
        title: parsed.data.title,
        description: parsed.data.description,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(
        `/teacher/courses/${existing.course_id}/edit/resources`,
      );
      if (existing.module_id) {
        revalidatePath(
          `/teacher/courses/${existing.course_id}/edit/modules/${existing.module_id}`,
        );
      }

      return ok(undefined);
    });
  } catch (e) {
    logger.error("updateCourseResourceAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
