"use server";

// Server action: crear un evento en el calendario de un curso.
// Patron thin (ARCHITECTURE.md regla 2): parse + auth + service +
// revalidatePath + Result.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { calendarService } from "@/modules/calendar/services";
import { createEventSchema } from "@/modules/calendar/validations";
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

export interface CreateEventResult {
  eventId: string;
}

export async function createEventAction(
  input: unknown,
): Promise<Result<CreateEventResult, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = createEventSchema.safeParse(input);
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

      const result = await calendarService.createEvent({
        actor: user,
        courseId: parsed.data.courseId,
        title: parsed.data.title,
        description: parsed.data.description,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(`/learn/${parsed.data.courseId}/calendar`);
      revalidatePath(`/learn/${parsed.data.courseId}`);
      revalidatePath("/teacher");

      return ok({ eventId: result.value.id });
    });
  } catch (e) {
    logger.error("createEventAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
