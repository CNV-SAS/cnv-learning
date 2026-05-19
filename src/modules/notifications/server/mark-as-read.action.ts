"use server";

// Server action: el user marca una notification como leida.
// Patron thin: Zod parse + auth + repo + revalidatePath +
// Result<void, ActionError>.
//
// RLS valida user_id = auth.uid() en el UPDATE, asi que un
// notificationId de otro user simplemente no afecta filas (no
// error). El revalidatePath actualiza el contador del bell y la
// lista en /notifications.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { notificationRepository } from "@/modules/notifications/data";
import { markAsReadSchema } from "@/modules/notifications/validations";
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

export async function markAsReadAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = markAsReadSchema.safeParse(input);
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
              "Tu sesión expiró. Vuelve a iniciar.",
            ),
          ),
        );
      }

      await notificationRepository.markAsRead(parsed.data.notificationId);

      revalidatePath("/notifications");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("markAsReadAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
