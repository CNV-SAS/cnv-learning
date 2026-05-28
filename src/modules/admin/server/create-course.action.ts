"use server";

// Server action: admin crea un curso nuevo (Bloque 23.1). Patron
// thin. Policy + slug check + audit viven en courseMetaService.
// is_published se setea hardcoded en false; habilitarlo es decision
// posterior via updateCourseAction.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseMetaService } from "@/modules/courses/services/course-meta.service";
import { createCourseSchema } from "@/modules/courses/validations";
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

export interface CreateCourseResult {
  courseId: string;
}

export async function createCourseAction(
  input: unknown,
): Promise<Result<CreateCourseResult, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = createCourseSchema.safeParse(input);
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

      const result = await courseMetaService.createCourse({
        actor: user,
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description ?? null,
        coverUrl: parsed.data.coverUrl ?? null,
        passingGrade: parsed.data.passingGrade,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath("/admin/courses");

      return ok({ courseId: result.value.courseId });
    });
  } catch (e) {
    logger.error("createCourseAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
