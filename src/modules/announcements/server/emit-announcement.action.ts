"use server";

// Server action: emite un anuncio (scope='course' o 'global').
// Discriminated input por `scope`. Patron thin: parse + auth +
// service + revalidatePath + Result<{announcementId}, ActionError>.
//
// Rate limit + policy + audit + delivery (notifications bulk +
// emails) viven en el service.
//
// revalidatePath('/notifications') hace que los recipients vean el
// bell + lista actualizados en su proxima nav.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { announcementService } from "@/modules/announcements/services";
import {
  createCourseAnnouncementSchema,
  createGlobalAnnouncementSchema,
} from "@/modules/announcements/validations";
import { ok, err, type Result } from "@/lib/utils/result";
import {
  type ActionError,
  toActionError,
  validationErrorToActionError,
  unexpectedActionError,
} from "@/lib/utils/action-error";
import { AuthenticationError, ValidationError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";

const scopeSchema = z.object({
  scope: z.enum(["course", "global"]),
});

export interface EmitAnnouncementResult {
  announcementId: string;
}

export async function emitAnnouncementAction(
  input: unknown,
): Promise<Result<EmitAnnouncementResult, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const scopeParsed = scopeSchema.safeParse(input);
      if (!scopeParsed.success) {
        return err(
          toActionError(
            new ValidationError(
              ErrorCodes.VALIDATION_FAILED,
              "Scope de anuncio inválido.",
            ),
          ),
        );
      }

      const user = await profileRepository.getCurrentUser();
      if (!user) {
        return err(
          toActionError(
            new AuthenticationError(
              ErrorCodes.AUTH_SESSION_EXPIRED,
              "Tu sesión expiró. Vuelve a iniciar.",
            ),
          ),
        );
      }

      if (scopeParsed.data.scope === "course") {
        const parsed = createCourseAnnouncementSchema.safeParse(input);
        if (!parsed.success) {
          return err(
            validationErrorToActionError(parsed.error, "Datos inválidos"),
          );
        }
        const result = await announcementService.emitCourseAnnouncement({
          user,
          courseId: parsed.data.courseId,
          title: parsed.data.title,
          body: parsed.data.body,
        });
        if (!result.ok) return err(toActionError(result.error));
        revalidatePath("/notifications");
        return ok({ announcementId: result.value.id });
      }

      // scope === 'global'
      const parsed = createGlobalAnnouncementSchema.safeParse(input);
      if (!parsed.success) {
        return err(
          validationErrorToActionError(parsed.error, "Datos inválidos"),
        );
      }
      const result = await announcementService.emitGlobalAnnouncement({
        user,
        title: parsed.data.title,
        body: parsed.data.body,
      });
      if (!result.ok) return err(toActionError(result.error));
      revalidatePath("/notifications");
      return ok({ announcementId: result.value.id });
    });
  } catch (e) {
    logger.error("emitAnnouncementAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
