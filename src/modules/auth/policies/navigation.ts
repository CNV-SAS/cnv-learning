// Policy: navegacion principal por rol. Define el catalogo de items
// del sidebar y resuelve cuales debe ver un user dado.
//
// Source of truth del shape NavItem: el dominio (esta policy)
// define la estructura, los componentes UI la consumen via import.
// Regla dura 3 de ARCHITECTURE.md: la comparacion user.role === ...
// vive aqui (en allowedRoles.includes) y NUNCA en el sidebar.
//
// Items omitidos conscientemente del MVP en Bloque 3:
// - Perfil: pendiente de Bloque 16 (no hay ruta /profile aun, link
//   a 404 seria mal UX).
// - Notificaciones: pendiente de Bloque 10.
// Otros (cursos, foro, certificados) se agregan en sus bloques
// respectivos cuando exista la ruta correspondiente.

import { LayoutDashboard, Shield, type LucideIcon } from "lucide-react";
import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  allowedRoles: ReadonlyArray<UserRole>;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "teacher", "student"],
  },
  {
    label: "Admin",
    href: "/admin",
    icon: Shield,
    allowedRoles: ["admin"],
  },
];

export function getNavigationFor(user: AuthenticatedUser): NavItem[] {
  return NAV_ITEMS.filter((item) => item.allowedRoles.includes(user.role));
}
