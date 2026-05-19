"use server";

// Server action: cualquier rol autenticado crea un thread en un
// foro. Patron thin: Zod parse + auth + service + revalidatePath
// + Result<{threadId}, ActionError>.
//
// Devuelve threadId para que el form pueda redirigir al thread
// recien creado (router.push). revalidatePath del foro contenedor
// invalida la cache de revalidate:30 que define ARCHITECTURE.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { forumService } from "@/modules/forum/services/forum.service";
import { createThreadSchema } from "@/modules/forum/validations";
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

export interface CreateThreadResult {
  threadId: string;
}

export async function createThreadAction(
  input: unknown,
): Promise<Result<CreateThreadResult, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = createThreadSchema.safeParse(input);
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
              "Tu sesión expiró. Vuelve a iniciar.",
            ),
          ),
        );
      }

      const result = await forumService.createThread({
        user,
        forumId: parsed.data.forumId,
        title: parsed.data.title,
        body: parsed.data.body,
      });
      if (!result.ok) return err(toActionError(result.error));

      // Invalida la lista del foro contenedor para que el nuevo
      // thread aparezca inmediatamente al redirigir o volver atras.
      revalidatePath(
        `/learn/${parsed.data.courseId}/forum/${parsed.data.forumId}`,
      );

      return ok({ threadId: result.value.id });
    });
  } catch (e) {
    logger.error("createThreadAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
