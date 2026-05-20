"use server";

// Server action: cancela un enrollment (soft delete, is_active=false).
// Preserva progreso historico + submissions del usuario.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { adminEnrollmentService } from "@/modules/admin/services";
import { cancelEnrollmentSchema } from "@/modules/admin/validations";
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

interface CancelEnrollmentInput {
  enrollmentId: string;
  userId: string;
}

export async function cancelEnrollmentAction(
  input: CancelEnrollmentInput,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = cancelEnrollmentSchema.safeParse({
        enrollmentId: input.enrollmentId,
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

      const result = await adminEnrollmentService.cancelEnrollment({
        actor: user,
        enrollmentId: parsed.data.enrollmentId,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath(`/admin/users/${input.userId}/enrollments`);
      revalidatePath(`/admin/users/${input.userId}`);

      return ok(undefined);
    });
  } catch (e) {
    logger.error("cancelEnrollmentAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
