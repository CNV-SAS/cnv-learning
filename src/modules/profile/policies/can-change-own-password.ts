// Policy: cualquier user autenticado cambia su propia password
// desde /profile. El service hace el segundo gate verificando el
// current_password via supabase.auth.signInWithPassword
// (consideracion A1 del plan B16: UX layer estandar para datos
// sensibles).
//
// La diferencia con resetPassword del Bloque 2:
//   - resetPassword: sesion temporal de recovery, NO requiere
//     current_password (el user ya demostro control del email).
//   - changePassword: sesion normal, requiere current_password
//     para evitar abuso si el dispositivo queda abierto.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canChangeOwnPassword(user: AuthenticatedUser): boolean {
  // Mismo patron exhaustivo que canEditOwnProfile.
  return (
    user.role === "student" ||
    user.role === "teacher" ||
    user.role === "admin"
  );
}
