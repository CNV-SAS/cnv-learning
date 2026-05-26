"use server";

// Server action: admin actualiza el nombre completo de un usuario
// (Bloque 22.15). Patron thin. Policy + audit + idempotencia viven
// en adminUserService.updateName.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { adminUserService } from "@/modules/admin/services";
import { updateUserNameSchema } from "@/modules/admin/validations";
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

export async function updateUserNameAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = updateUserNameSchema.safeParse(input);
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

      const result = await adminUserService.updateName({
        actor: user,
        targetUserId: parsed.data.userId,
        newFullName: parsed.data.fullName,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath("/admin/users");
      revalidatePath(`/admin/users/${parsed.data.userId}`);
      // El nombre tambien aparece en certificados emitidos a este
      // user; revalidar /admin/certificates por si la tabla muestra
      // studentName via embed join.
      revalidatePath("/admin/certificates");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("updateUserNameAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
