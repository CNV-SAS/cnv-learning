"use server";

// Server action: solicitar email de reset de password.
// Anti email enumeration: SIEMPRE retorna ok aunque el email no exista
// o la API de email falle. El service ya implementa esa logica; aqui
// solo validamos input, extraemos IP para rate limit, y delegamos.

import { headers } from "next/headers";
import { authService } from "@/modules/auth/services/auth.service";
import { forgotPasswordSchema } from "@/modules/auth/validations";
import { AppError, ValidationError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { err, type Result } from "@/lib/utils/result";
import { withContext } from "@/core/logger/context";

export async function forgotPasswordAction(
  input: unknown,
): Promise<Result<void, AppError>> {
  const requestId = crypto.randomUUID();

  return withContext({ requestId }, async () => {
    const parsed = forgotPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return err(
        new ValidationError(
          ErrorCodes.VALIDATION_FAILED,
          parsed.error.issues[0]?.message ?? "Datos invalidos",
        ),
      );
    }

    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    // redirectTo del email = confirm handler que hace verifyOtp con
    // token_hash + type=recovery (patron oficial de Supabase para
    // email-based flows) y luego redirige al destino final
    // /reset-password con sesion ya activa.
    // Si pasaramos /reset-password directo, el handler nunca consumiria
    // el OTP token y updateUser fallaria con session_missing.
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/reset-password`;

    return authService.requestPasswordReset({
      email: parsed.data.email,
      ip,
      redirectTo,
    });
  });
}
