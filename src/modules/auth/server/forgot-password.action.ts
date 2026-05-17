"use server";

// Server action: solicitar email de reset de password.
// Anti email enumeration: SIEMPRE retorna ok aunque el email no exista
// o la API de email falle (el service implementa esa logica).

import { headers } from "next/headers";
import { authService } from "@/modules/auth/services/auth.service";
import { forgotPasswordSchema } from "@/modules/auth/validations";
import { err, ok, type Result } from "@/lib/utils/result";
import {
  type ActionError,
  toActionError,
  validationErrorToActionError,
  unexpectedActionError,
} from "@/lib/utils/action-error";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";

export async function forgotPasswordAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = forgotPasswordSchema.safeParse(input);
      if (!parsed.success) {
        return err(
          validationErrorToActionError(parsed.error, "Datos invalidos"),
        );
      }

      const h = await headers();
      const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

      // redirectTo del email = confirm handler que hace verifyOtp con
      // token_hash + type=recovery (patron oficial de Supabase para
      // email-based flows) y luego redirige al destino final
      // /reset-password con sesion ya activa.
      const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/reset-password`;

      const result = await authService.requestPasswordReset({
        email: parsed.data.email,
        ip,
        redirectTo,
      });

      if (!result.ok) return err(toActionError(result.error));
      return ok(undefined);
    });
  } catch (e) {
    logger.error("forgotPasswordAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
