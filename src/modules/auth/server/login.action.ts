"use server";

// Server action: login con email + password + next opcional.
// Patron thin (ARCHITECTURE.md 211-246): valida input + extrae IP/UA +
// llama al service + retorna Result. NO usa redirect() directo; devuelve
// { redirectTo } en Result para que el client decida navegacion.
//
// Retorna Result<T, ActionError> (plain object), NO Result<T, AppError>
// (class instance), porque Next.js Server Actions usa structured clone
// y class instances pierden custom props (ver lib/utils/action-error.ts).

import { headers } from "next/headers";
import { authService } from "@/modules/auth/services/auth.service";
import { loginSchema } from "@/modules/auth/validations";
import { ok, err, type Result } from "@/lib/utils/result";
import {
  type ActionError,
  toActionError,
  validationErrorToActionError,
  unexpectedActionError,
} from "@/lib/utils/action-error";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";

export async function loginAction(
  input: unknown,
): Promise<Result<{ redirectTo: string }, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = loginSchema.safeParse(input);
      if (!parsed.success) {
        return err(
          validationErrorToActionError(parsed.error, "Datos invalidos"),
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

      if (!result.ok) return err(toActionError(result.error));

      // next ya validado por Zod (anti open-redirect: starts with "/", no
      // empieza con "//"). Default "/dashboard" si no se especifico.
      return ok({ redirectTo: parsed.data.next ?? "/dashboard" });
    });
  } catch (e) {
    logger.error("loginAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
