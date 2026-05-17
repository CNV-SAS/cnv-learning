"use server";

// Server action: aplicar el nuevo password tras click del email.
// Requiere sesion activa: el route handler /auth/confirm hizo
// verifyOtp({ type: 'recovery', token_hash }) antes de redirigir
// aqui (patron oficial de Supabase para email-based flows),
// creando la sesion temporal que updateUser necesita.
// Si el user llega a /reset-password sin pasar por /auth/confirm,
// updateUser falla con session_missing.

import { authService } from "@/modules/auth/services/auth.service";
import { resetPasswordSchema } from "@/modules/auth/validations";
import { ok, err, type Result } from "@/lib/utils/result";
import {
  type ActionError,
  toActionError,
  validationErrorToActionError,
  unexpectedActionError,
} from "@/lib/utils/action-error";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";

export async function resetPasswordAction(
  input: unknown,
): Promise<Result<{ redirectTo: string }, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = resetPasswordSchema.safeParse(input);
      if (!parsed.success) {
        return err(
          validationErrorToActionError(parsed.error, "Datos invalidos"),
        );
      }

      const result = await authService.resetPassword(parsed.data.password);
      if (!result.ok) return err(toActionError(result.error));

      return ok({ redirectTo: "/login" });
    });
  } catch (e) {
    logger.error("resetPasswordAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
