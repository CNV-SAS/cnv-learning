"use server";

// Server action: admin elimina un curso (Bloque 23 smoke #2). Patron
// thin. Policy + confirmacion textual + audit + CASCADE viven en
// courseMetaService.deleteCourse.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseMetaService } from "@/modules/courses/services/course-meta.service";
import { deleteCourseSchema } from "@/modules/courses/validations";
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

export async function deleteCourseAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = deleteCourseSchema.safeParse(input);
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

      const result = await courseMetaService.deleteCourse({
        actor: user,
        courseId: parsed.data.courseId,
        confirmTitle: parsed.data.confirmTitle,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath("/admin/courses");
      revalidatePath("/dashboard");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("deleteCourseAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
