"use server";

// Server action: admin elimina un certificado academico (borra row +
// blob del bucket). Operacion hard delete porque academic certs no
// tienen revocacion logica; si hay error en el PDF subido, se borra
// y se vuelve a subir.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { academicCertificateService } from "@/modules/certificates/services";
import { academicCertificateRepository } from "@/modules/certificates/data";
import { deleteAcademicCertificateSchema } from "@/modules/certificates/validations";
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

export async function deleteAcademicCertificateAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = deleteAcademicCertificateSchema.safeParse(input);
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

      // Resolver target_user_id antes del delete para revalidar la
      // ruta correcta despues. El service tambien hace su findById,
      // asi que esto es informacion incidental para el revalidatePath.
      const cert = await academicCertificateRepository.findById(
        parsed.data.id,
      );

      const result = await academicCertificateService.deleteById({
        actor: user,
        id: parsed.data.id,
      });
      if (!result.ok) return err(toActionError(result.error));

      if (cert) revalidatePath(`/admin/users/${cert.user_id}`);

      return ok(undefined);
    });
  } catch (e) {
    logger.error("deleteAcademicCertificateAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
