"use server";

// Server action: autor o admin edita title + body de un thread.
// Patron thin: Zod parse + auth + service + revalidatePath +
// Result<void, ActionError>.

import { revalidatePath } from "next/cache";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { forumService } from "@/modules/forum/services/forum.service";
import { editThreadSchema } from "@/modules/forum/validations";
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

export async function editThreadAction(
  input: unknown,
): Promise<Result<void, ActionError>> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const parsed = editThreadSchema.safeParse(input);
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

      const result = await forumService.editThread({
        user,
        threadId: parsed.data.threadId,
        title: parsed.data.title,
        body: parsed.data.body,
      });
      if (!result.ok) return err(toActionError(result.error));

      // Invalida lista del foro (updated_at cambia el orden) y la
      // vista del thread (title/body cambian).
      revalidatePath(
        `/learn/${parsed.data.courseId}/forum/${parsed.data.forumId}`,
      );
      revalidatePath(
        `/learn/${parsed.data.courseId}/forum/${parsed.data.forumId}/thread/${parsed.data.threadId}`,
      );

      return ok(undefined);
    });
  } catch (e) {
    logger.error("editThreadAction unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err(unexpectedActionError());
  }
}
