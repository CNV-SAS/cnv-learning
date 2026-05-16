"use server";

// Server action: logout. Limpia la sesion y retorna redirectTo a /login.

import { authService } from "@/modules/auth/services/auth.service";
import type { AppError } from "@/core/errors/classes";
import { ok, type Result } from "@/lib/utils/result";
import { withContext } from "@/core/logger/context";

export async function logoutAction(): Promise<
  Result<{ redirectTo: string }, AppError>
> {
  const requestId = crypto.randomUUID();

  return withContext({ requestId }, async () => {
    const result = await authService.logout();
    if (!result.ok) return result;
    return ok({ redirectTo: "/login" });
  });
}
