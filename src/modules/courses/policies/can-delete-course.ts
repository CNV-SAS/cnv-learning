// Policy: solo admin puede borrar un curso (decision D2 plan B23 +
// reafirmada en smoke #2). El flag can_manage_course de teachers
// NO desbloquea borrado, solo edita metadata.
//
// Separada de canCreateCourse (aunque hoy ambas son admin-only) por
// claridad semantica: si v2 introduce super-admin o requiere
// confirmacion adicional para delete, el cambio queda localizado.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canDeleteCourse(user: AuthenticatedUser): boolean {
  return user.role === "admin";
}
