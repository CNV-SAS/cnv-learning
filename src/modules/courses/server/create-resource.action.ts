"use server";

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseResourceService } from "@/modules/courses/services/course-resource.service";
import { createCourseResourceSchema } from "@/modules/courses/validations";
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

export interface CreateCourseResourceResult {
  resourceId: string;
}

export async function createCourseResourceAction(
  input: unknown,
): Promise<Result<CreateCourseResourceResult, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = createCourseResourceSchema.safeParse(input);
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

      const result = await courseResourceService.createResource({
        user,
        courseId: parsed.data.courseId,
        moduleId: parsed.data.moduleId,
        kind: parsed.data.kind,
        title: parsed.data.title,
        description: parsed.data.description,
        storagePath: parsed.data.storagePath,
        sizeBytes: parsed.data.sizeBytes,
        mimeType: parsed.data.mimeType,
        externalUrl: parsed.data.externalUrl,
      });
      if (!result.ok) return err(toActionError(result.error));

      // Revalidar tanto la pagina general de recursos como el module
      // detail (que tiene la seccion Recursos del modulo en 20.2).
      revalidatePath(`/teacher/courses/${parsed.data.courseId}/edit/resources`);
      if (parsed.data.moduleId) {
        revalidatePath(
          `/teacher/courses/${parsed.data.courseId}/edit/modules/${parsed.data.moduleId}`,
        );
      }

      return ok({ resourceId: result.value.id });
    });
  } catch (e) {
    logger.error("createCourseResourceAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
