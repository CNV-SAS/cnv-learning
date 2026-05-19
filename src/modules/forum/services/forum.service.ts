// Service: orquesta operaciones de foro (crear thread, editar
// thread, crear reply). ARCHITECTURE.md regla 2 (actions thin
// llaman service; logica de negocio aqui).
//
// Cada metodo:
//   1. Rate limit (lib/ratelimit forum bucket: 30/1h por user).
//   2. Lookup de entidad (forum o thread) para policy + 404 temprano.
//   3. Policy check.
//   4. Repo write. RLS final lo respalda con codigo SQL.
//   5. Result<T, AppError>.
//
// Sin audit log (decision Bloque 9: foros no son evento critico
// per regla 8). Sin emision de events (no notifications en MVP).
//
// Bloque 10 cableara handlers de "forum.thread.replied" para email
// y notificaciones in-app sin tocar este service.

import {
  forumRepository,
  threadRepository,
  replyRepository,
} from "@/modules/forum/data";
import {
  canPostInForum,
  canEditThread,
} from "@/modules/forum/policies";
import { ratelimit } from "@/lib/ratelimit";
import {
  AppError,
  AuthorizationError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { ForumThread } from "../types";

function forumRateLimitError(secondsLeft: number): AppError {
  return new AppError(
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    `Demasiadas publicaciones en el foro. Vuelve a intentar en ${secondsLeft} segundos.`,
    429,
  );
}

interface CreateThreadParams {
  user: AuthenticatedUser;
  forumId: string;
  title: string;
  body: string;
}

interface EditThreadParams {
  user: AuthenticatedUser;
  threadId: string;
  title: string;
  body: string;
}

interface CreateReplyParams {
  user: AuthenticatedUser;
  threadId: string;
  body: string;
}

export const forumService = {
  async createThread(
    params: CreateThreadParams,
  ): Promise<Result<ForumThread, AppError>> {
    const limit = await ratelimit.forum.limit(params.user.id);
    if (!limit.success) {
      const secondsLeft = Math.ceil((limit.reset - Date.now()) / 1000);
      return err(forumRateLimitError(secondsLeft));
    }

    const forum = await forumRepository.findById(params.forumId);
    const allowed = canPostInForum(params.user, {
      forumExists: forum !== null,
    });
    if (!forum) {
      return err(
        new NotFoundError(ErrorCodes.FORUM_NOT_FOUND, "Foro no encontrado."),
      );
    }
    if (!allowed) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_POST_IN_FORUM,
          "No puedes publicar en este foro.",
        ),
      );
    }

    const thread = await threadRepository.create({
      forum_id: params.forumId,
      author_id: params.user.id,
      title: params.title,
      body: params.body,
    });

    return ok(thread);
  },

  async editThread(
    params: EditThreadParams,
  ): Promise<Result<ForumThread, AppError>> {
    const existing = await threadRepository.findById(params.threadId);
    if (!existing) {
      return err(
        new NotFoundError(
          ErrorCodes.THREAD_NOT_FOUND,
          "Thread no encontrado.",
        ),
      );
    }

    const allowed = canEditThread(params.user, {
      threadExists: true,
      authorId: existing.author_id,
    });
    if (!allowed) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_EDIT_THREAD,
          "Solo el autor o un administrador puede editar este post.",
        ),
      );
    }

    const updated = await threadRepository.update(params.threadId, {
      title: params.title,
      body: params.body,
    });

    return ok(updated);
  },

  async createReply(
    params: CreateReplyParams,
  ): Promise<Result<void, AppError>> {
    const limit = await ratelimit.forum.limit(params.user.id);
    if (!limit.success) {
      const secondsLeft = Math.ceil((limit.reset - Date.now()) / 1000);
      return err(forumRateLimitError(secondsLeft));
    }

    const thread = await threadRepository.findById(params.threadId);
    if (!thread) {
      return err(
        new NotFoundError(
          ErrorCodes.THREAD_NOT_FOUND,
          "Thread no encontrado.",
        ),
      );
    }

    // Reply usa la misma policy que post: rol valido + recurso
    // existe. RLS de forum_replies INSERT valida enrollment.
    const allowed = canPostInForum(params.user, { forumExists: true });
    if (!allowed) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_POST_IN_FORUM,
          "No puedes responder en este foro.",
        ),
      );
    }

    await replyRepository.create({
      thread_id: params.threadId,
      author_id: params.user.id,
      body: params.body,
    });

    return ok(undefined);
  },
};
