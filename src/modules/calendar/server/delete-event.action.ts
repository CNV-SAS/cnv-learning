"use server";

// Server action: eliminar un evento del calendario. Hard delete
// sin confirmation typeo (el evento no destruye progreso del
// alumno; un teacher recrea facilmente si fue accidente). Audit
// ANTES del delete preserva snapshot en metadata.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { calendarService } from "@/modules/calendar/services";
import { deleteEventSchema } from "@/modules/calendar/validations";
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

interface DeleteEventActionInput {
  eventId: string;
  courseId: string;
}

export async function deleteEventAction(
  input: DeleteEventActionInput,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = deleteEventSchema.safeParse({ eventId: input.eventId });
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

      const result = await calendarService.deleteEvent({
        actor: user,
        eventId: parsed.data.eventId,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(`/learn/${input.courseId}/calendar`);
      revalidatePath(`/learn/${input.courseId}`);
      revalidatePath("/teacher");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("deleteEventAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
