"use server";

// Server action: actualizar los 6 campos editables del propio
// perfil. Patron thin: parse + auth + service + revalidatePath.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { profileService } from "@/modules/profile/services";
import { updateProfileSchema } from "@/modules/profile/validations";
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

export async function updateProfileAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = updateProfileSchema.safeParse(input);
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

      const result = await profileService.updateProfile({
        actor: user,
        fullName: parsed.data.fullName,
        bio: parsed.data.bio,
        professionalLicense: parsed.data.professionalLicense,
        institution: parsed.data.institution,
        specialization: parsed.data.specialization,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath("/profile");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("updateProfileAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
