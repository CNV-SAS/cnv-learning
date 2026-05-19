// Policy: el usuario puede crear thread o reply en este foro.
//
// MVP: cualquier rol autenticado puede postear si el foro existe.
// RLS (DATABASE.md 980-994 y 1029-1046) hace el chequeo real de
// enrollment/teaching ownership en el INSERT; la policy aqui es
// early-exit para no llegar al insert con un id falso.
//
// El shape ContextBased existe para consistencia con otras policies
// del proyecto (assignments/policies) y para que migracion a ABAC
// no requiera refactor de call sites.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface ForumPostContext {
  forumExists: boolean;
}

export function canPostInForum(
  user: AuthenticatedUser,
  context: ForumPostContext,
): boolean {
  // Todos los roles activos pueden postear si el foro existe.
  if (user.role !== "student" && user.role !== "teacher" && user.role !== "admin") {
    return false;
  }
  return context.forumExists;
}
