"use server";

// Server action: cambia la password del usuario autenticado.
// Verifica current_password en el service via cliente no
// persistente (createVerifyClient) antes de aceptar la nueva.

import { profileRepository } from "@/modules/auth/data/profile.repository";
import { profileService } from "@/modules/profile/services";
import { changePasswordSchema } from "@/modules/profile/validations";
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

export async function changePasswordAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = changePasswordSchema.safeParse(input);
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

      const result = await profileService.changePassword({
        actor: user,
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      });
      if (!result.ok) return err(toActionError(result.error));

      // No revalidatePath: la password no es visible en ninguna
      // pagina cacheada. El user permanece logueado.

      return ok(undefined);
    });
  } catch (e) {
    logger.error("changePasswordAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
