"use server";

// Server action: el user marca TODAS sus notifications no leidas
// como leidas. Sin input (auth.uid() resuelve el scope).
// Pensado para el boton "Marcar todas como leidas" del header de
// /notifications.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { notificationRepository } from "@/modules/notifications/data";
import { ok, err, type Result } from "@/lib/utils/result";
import {
  type ActionError,
  toActionError,
  unexpectedActionError,
} from "@/lib/utils/action-error";
import { AuthenticationError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";

export async function markAllAsReadAction(): Promise<
  Result<void, ActionError>
> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
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

      await notificationRepository.markAllAsRead(user.id);

      revalidatePath("/notifications");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("markAllAsReadAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
