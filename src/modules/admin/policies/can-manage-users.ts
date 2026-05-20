// Policy base de gestion de usuarios: solo admin.
//
// Es el gate de entrada para todas las paginas y actions del CRUD
// de usuarios (lista, crear, ver detalle). Las acciones especificas
// con guards adicionales (cambiar rol, suspender, eliminar) usan
// policies dedicadas que componen esta verificacion.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canManageUsers(user: AuthenticatedUser): boolean {
  return user.role === "admin";
}
