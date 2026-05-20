"use server";

// Server action: persiste la URL del avatar tras upload exitoso a
// Supabase Storage (el componente cliente sube el blob direct y
// luego llama aqui con la URL publica).

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { profileService } from "@/modules/profile/services";
import { updateAvatarSchema } from "@/modules/profile/validations";
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

export async function updateAvatarAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = updateAvatarSchema.safeParse(input);
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

      const result = await profileService.updateAvatar({
        actor: user,
        avatarUrl: parsed.data.avatarUrl,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath("/profile");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("updateAvatarAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
