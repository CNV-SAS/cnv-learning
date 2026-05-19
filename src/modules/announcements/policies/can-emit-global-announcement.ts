// Policy: el usuario puede emitir un anuncio scope='global'.
//
// Solo admin. RLS "Admins manage announcements" es la defensa real
// en el INSERT.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canEmitGlobalAnnouncement(
  user: AuthenticatedUser,
): boolean {
  return user.role === "admin";
}
