"use server";

// Server action: asignar un docente (target.role='teacher') a un
// curso via course_teachers. Patron thin.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { adminEnrollmentService } from "@/modules/admin/services";
import { assignTeacherToCourseSchema } from "@/modules/admin/validations";
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

export async function assignTeacherToCourseAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = assignTeacherToCourseSchema.safeParse(input);
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

      const result = await adminEnrollmentService.assignTeacherToCourse({
        actor: user,
        teacherUserId: parsed.data.teacherUserId,
        courseId: parsed.data.courseId,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(`/admin/users/${parsed.data.teacherUserId}/enrollments`);
      revalidatePath(`/admin/users/${parsed.data.teacherUserId}`);
      // 23.1.e: /admin/courses/[id]/teachers consume la lista de
      // asignaciones del curso.
      revalidatePath(`/admin/courses/${parsed.data.courseId}/teachers`);

      return ok(undefined);
    });
  } catch (e) {
    logger.error("assignTeacherToCourseAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
