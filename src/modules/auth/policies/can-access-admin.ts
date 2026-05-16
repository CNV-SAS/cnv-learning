// Policy: el usuario puede acceder a las paginas del panel admin
// (/admin/*). Solo admin.
//
// Patron policy (ARCHITECTURE.md regla dura 3): funcion pura, NO
// chequeos de user.role === 'admin' dispersos por el codigo. Toda
// decision de "puede entrar a /admin/..." pasa por esta funcion.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canAccessAdmin(user: AuthenticatedUser): boolean {
  return user.role === "admin";
}
