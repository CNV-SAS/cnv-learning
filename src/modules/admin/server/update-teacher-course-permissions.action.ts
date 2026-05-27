"use server";

// Server action: admin flip el flag can_manage_course de una
// asignacion teacher-course existente (Bloque 23.1.c). Patron thin.
// Policy + idempotencia + audit viven en
// adminEnrollmentService.updateTeacherCanManageCourse.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { adminEnrollmentService } from "@/modules/admin/services";
import { updateTeacherCoursePermissionsSchema } from "@/modules/admin/validations";
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

export async function updateTeacherCoursePermissionsAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = updateTeacherCoursePermissionsSchema.safeParse(input);
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

      const result =
        await adminEnrollmentService.updateTeacherCanManageCourse({
          actor: user,
          teacherUserId: parsed.data.teacherUserId,
          courseId: parsed.data.courseId,
          canManageCourse: parsed.data.canManageCourse,
        });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(`/admin/courses/${parsed.data.courseId}/teachers`);
      revalidatePath(`/admin/users/${parsed.data.teacherUserId}/enrollments`);

      return ok(undefined);
    });
  } catch (e) {
    logger.error("updateTeacherCoursePermissionsAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
