"use server";

// Server action: login con email + password + next opcional.
// Patron thin (ARCHITECTURE.md 211-246): valida input + extrae IP/UA +
// llama al service + retorna Result. NO usa redirect() directo; devuelve
// { redirectTo } en Result para que el client decida navegacion (mejor
// testabilidad y tipos mas limpios).

import { headers } from "next/headers";
import { authService } from "@/modules/auth/services/auth.service";
import { loginSchema } from "@/modules/auth/validations";
import { AppError, ValidationError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import { withContext } from "@/core/logger/context";

export async function loginAction(
  input: unknown,
): Promise<Result<{ redirectTo: string }, AppError>> {
  const requestId = crypto.randomUUID();

  return withContext({ requestId }, async () => {
    const parsed = loginSchema.safeParse(input);
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
    const userAgent = h.get("user-agent") ?? "unknown";

    const result = await authService.login({
      email: parsed.data.email,
      password: parsed.data.password,
      ip,
      userAgent,
    });

    if (!result.ok) return result;

    // next ya validado por Zod (anti open-redirect: starts with "/", no
    // empieza con "//"). Default "/dashboard" si no se especifico.
    return ok({ redirectTo: parsed.data.next ?? "/dashboard" });
  });
}
