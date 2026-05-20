// Policy: el admin puede eliminar (hard delete) un user objetivo.
//
// Guards (consideracion del plan B14):
//   - Solo admin.
//   - Anti-self: admin no puede eliminarse a si mismo.
//   - Anti-lockout: no eliminar al ultimo admin.
//
// Hard delete via supabase.auth.admin.deleteUser. Cascade limpia
// profile + enrollments + lesson_progress + submissions + gradings
// + certificates + forum_threads + forum_replies + notifications
// per FK constraints. audit_logs.actor_id se preserva via SET NULL
// (verificado en 14.3).

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface DeleteUserContext {
  targetUserId: string;
  // true si target es admin Y es el unico admin del sistema.
  isLastAdmin: boolean;
}

export function canDeleteUser(
  actor: AuthenticatedUser,
  context: DeleteUserContext,
): boolean {
  if (actor.role !== "admin") return false;
  if (actor.id === context.targetUserId) return false;
  if (context.isLastAdmin) return false;
  return true;
}
