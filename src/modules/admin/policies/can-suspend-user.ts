// Policy: el admin puede suspender (ban via Supabase auth) un user.
//
// Guards (consideracion del plan B14):
//   - Solo admin.
//   - Anti-self: admin no se suspende a si mismo.
//   - Anti-lockout: no suspender al ultimo admin.
//
// Suspend usa supabase.auth.admin.updateUserById con ban_duration
// largo (revisable). Reversible via unsuspendUser.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface SuspendUserContext {
  targetUserId: string;
  isLastAdmin: boolean;
}

export function canSuspendUser(
  actor: AuthenticatedUser,
  context: SuspendUserContext,
): boolean {
  if (actor.role !== "admin") return false;
  if (actor.id === context.targetUserId) return false;
  if (context.isLastAdmin) return false;
  return true;
}
