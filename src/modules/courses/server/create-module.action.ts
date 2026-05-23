"use server";

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseContentEditorService } from "@/modules/courses/services/course-content-editor.service";
import { createModuleSchema } from "@/modules/courses/validations";
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

export interface CreateModuleResult {
  moduleId: string;
}

export async function createModuleAction(
  input: unknown,
): Promise<Result<CreateModuleResult, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = createModuleSchema.safeParse(input);
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

      const result = await courseContentEditorService.createModule({
        user,
        courseId: parsed.data.courseId,
        title: parsed.data.title,
        description: parsed.data.description,
        weight: parsed.data.weight,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(`/teacher/courses/${parsed.data.courseId}/edit`);

      return ok({ moduleId: result.value.id });
    });
  } catch (e) {
    logger.error("createModuleAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
