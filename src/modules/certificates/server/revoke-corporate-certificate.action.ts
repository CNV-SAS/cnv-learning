"use server";

// Server action: admin revoca un certificado corporativo. Mismo
// patron que revokeCertificateAction (Constancia). El service hace
// anti-doble-revoke + audit (regla 8).

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { corporateCertificateService } from "@/modules/certificates/services";
import { corporateCertificateRepository } from "@/modules/certificates/data";
import { revokeCorporateCertificateSchema } from "@/modules/certificates/validations";
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

export async function revokeCorporateCertificateAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = revokeCorporateCertificateSchema.safeParse(input);
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

      // Resolver user_id antes del revoke para revalidar la ruta del
      // detalle del student despues de actualizar.
      const cert = await corporateCertificateRepository.findById(
        parsed.data.id,
      );

      const result = await corporateCertificateService.revoke({
        actor: user,
        id: parsed.data.id,
        reason: parsed.data.reason,
      });
      if (!result.ok) return err(toActionError(result.error));

      if (cert) revalidatePath(`/admin/users/${cert.user_id}`);

      return ok(undefined);
    });
  } catch (e) {
    logger.error("revokeCorporateCertificateAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
