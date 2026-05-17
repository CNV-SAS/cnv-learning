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

    // redirectTo del email = callback handler que hace
    // exchangeCodeForSession (PKCE flow de @supabase/ssr) y luego
    // redirige al destino final /reset-password con sesion ya activa.
    // Si pasaramos /reset-password directo, el SDK nunca creaba la
    // sesion (el code en query params requiere exchange explicito) y
    // updateUser fallaria con session_missing.
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`;

    return authService.requestPasswordReset({
      email: parsed.data.email,
      ip,
      redirectTo,
    });
  });
}
