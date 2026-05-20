// Policy: el admin puede cambiar el rol de un user objetivo.
//
// Guards (consideracion del plan B14):
//   - Solo admin (rol del actor).
//   - Anti-self: admin NO puede cambiar su propio rol (incluso a
//     otro admin). Si quiere transferir el rol, primero promueve a
//     otro y luego ese otro lo degrada.
//   - Anti-lockout: si el target es el ultimo admin del sistema Y
//     el nuevo rol no es admin, bloquear. context.isLastAdmin se
//     resuelve por el caller via count.
//
// El cambio de rol es un evento critico (audit log obligatorio,
// regla 8 ARCHITECTURE).

import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

export interface ChangeRoleContext {
  targetUserId: string;
  newRole: UserRole;
  // true si el target actualmente es admin Y es el unico admin
  // activo en el sistema (count = 1). Resuelto por el caller.
  isLastAdmin: boolean;
}

export function canChangeRole(
  actor: AuthenticatedUser,
  context: ChangeRoleContext,
): boolean {
  if (actor.role !== "admin") return false;
  if (actor.id === context.targetUserId) return false;
  if (context.isLastAdmin && context.newRole !== "admin") return false;
  return true;
}
