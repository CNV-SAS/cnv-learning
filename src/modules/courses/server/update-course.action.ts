"use server";

// Server action: actualizar metadatos del curso (Bloque 23.1).
// Patron thin. Llama a courseMetaService.updateCourse que valida
// canEditCourseMeta (admin OR teacher con can_manage_course).
//
// Vive en courses/server (no en admin/server) porque la operacion
// no es admin-only: el teacher con flag tambien la dispara.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseMetaService } from "@/modules/courses/services/course-meta.service";
import { updateCourseSchema } from "@/modules/courses/validations";
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

export async function updateCourseAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = updateCourseSchema.safeParse(input);
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

      const result = await courseMetaService.updateCourse({
        actor: user,
        courseId: parsed.data.courseId,
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description ?? null,
        coverUrl: parsed.data.coverUrl ?? null,
        isPublished: parsed.data.isPublished,
        // passingGrade omitido a proposito: smoke E2E post-ISSUE-3
        // decision = inmutable despues del create. El service lo
        // ignora aunque viniera en el payload.
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath("/admin/courses");
      revalidatePath(`/admin/courses/${parsed.data.courseId}`);
      revalidatePath(`/teacher/courses/${parsed.data.courseId}/edit`);
      // El curso aparece en dashboards via courseRepository.listAllAccessible
      // y listForUser; revalidar /dashboard por si is_published cambio.
      revalidatePath("/dashboard");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("updateCourseAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
