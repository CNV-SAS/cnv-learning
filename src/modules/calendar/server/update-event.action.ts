"use server";

// Server action: actualizar un evento del calendario. courseId NO
// se modifica (semanticamente otro evento; se borra y crea).

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { calendarService } from "@/modules/calendar/services";
import { updateEventSchema } from "@/modules/calendar/validations";
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

interface UpdateEventActionInput {
  eventId: string;
  courseId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
}

export async function updateEventAction(
  input: UpdateEventActionInput,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = updateEventSchema.safeParse({
        eventId: input.eventId,
        title: input.title,
        description: input.description,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      });
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

      const result = await calendarService.updateEvent({
        actor: user,
        eventId: parsed.data.eventId,
        title: parsed.data.title,
        description: parsed.data.description,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(`/learn/${input.courseId}/calendar`);
      revalidatePath(`/learn/${input.courseId}`);
      revalidatePath("/teacher");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("updateEventAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
