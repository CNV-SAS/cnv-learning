"use server";

// Server action: quita el avatar (avatar_url=null + best-effort
// delete del blob). Fault-tolerant per consideracion I del plan.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { profileService } from "@/modules/profile/services";
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

export async function removeAvatarAction(): Promise<
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
              "Tu sesión expiró.",
            ),
          ),
        );
      }

      const result = await profileService.removeAvatar({ actor: user });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath("/profile");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("removeAvatarAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
