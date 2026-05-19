"use server";

// Server action: admin revoca un certificado. Patron thin: Zod
// parse + auth + service + revalidatePath + Result.
//
// El service hace policy check + audit. La pagina /verify del cert
// no necesita revalidatePath porque tiene dynamic=force-dynamic
// (cache-free); /admin/certificates si se revalida para que la
// tabla refleje el nuevo status sin F5.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { certificateService } from "@/modules/certificates/services";
import { revokeCertificateSchema } from "@/modules/certificates/validations";
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

export async function revokeCertificateAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = revokeCertificateSchema.safeParse(input);
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

      const result = await certificateService.revokeCertificate({
        user,
        certificateId: parsed.data.certificateId,
        reason: parsed.data.reason,
      });
      if (!result.ok) return err(toActionError(result.error));

      revalidatePath("/admin/certificates");

      return ok(undefined);
    });
  } catch (e) {
    logger.error("revokeCertificateAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
