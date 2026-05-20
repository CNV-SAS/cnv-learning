"use server";

// Server action: cambia el rol de un usuario (admin-only). Patron
// thin. Anti-self + anti-lockout viven en el service via policy
// canChangeRole.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { adminUserService } from "@/modules/admin/services";
import { updateRoleSchema } from "@/modules/admin/validations";
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

export async function updateUserRoleAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = updateRoleSchema.safeParse(input);
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

      const result = await adminUserService.updateRole({
        actor: user,
        targetUserId: parsed.data.userId,
        newRole: parsed.data.role,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath("/admin/users");
      revalidatePath(`/admin/users/${parsed.data.userId}`);

      return ok(undefined);
    });
  } catch (e) {
    logger.error("updateUserRoleAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
