"use server";

// Server action: logout. Limpia la sesion y retorna redirectTo a /login.

import { authService } from "@/modules/auth/services/auth.service";
import { ok, err, type Result } from "@/lib/utils/result";
import {
  type ActionError,
  toActionError,
  unexpectedActionError,
} from "@/lib/utils/action-error";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";

export async function logoutAction(): Promise<
  Result<{ redirectTo: string }, ActionError>
> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const result = await authService.logout();
      if (!result.ok) return err(toActionError(result.error));
      return ok({ redirectTo: "/login" });
    });
  } catch (e) {
    logger.error("logoutAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
