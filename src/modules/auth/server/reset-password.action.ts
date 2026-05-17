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
import { AppError, ValidationError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import { withContext } from "@/core/logger/context";

export async function resetPasswordAction(
  input: unknown,
): Promise<Result<{ redirectTo: string }, AppError>> {
  const requestId = crypto.randomUUID();

  return withContext({ requestId }, async () => {
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return err(
        new ValidationError(
          ErrorCodes.VALIDATION_FAILED,
          parsed.error.issues[0]?.message ?? "Datos invalidos",
        ),
      );
    }

    const result = await authService.resetPassword(parsed.data.password);
    if (!result.ok) return result;

    return ok({ redirectTo: "/login" });
  });
}
