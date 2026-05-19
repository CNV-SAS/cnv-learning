// Policy: navegacion principal por rol. Define el catalogo de items
// del sidebar y resuelve cuales debe ver un user dado.
//
// Source of truth del shape NavItem: el dominio (esta policy)
// define la estructura, los componentes UI la consumen via import.
// Regla dura 3 de ARCHITECTURE.md: la comparacion user.role === ...
// vive aqui (en allowedRoles.includes) y NUNCA en el sidebar.
//
// El icono va como NavIconName (string literal) en lugar de
// componente React directo: el shape debe ser serializable para
// cruzar la frontera Server -> Client (el SidebarItem es Client por
// usePathname y recibe el item como prop). Pasar el componente
// LucideIcon directo rompe runtime con "Functions cannot be passed
// to Client Components". La resolucion name -> componente vive en
// components/layout/nav-icon.tsx, donde corresponde.
//
// Items omitidos conscientemente del MVP:
// - Notificaciones: el bell del header reemplaza la entrada del
//   sidebar; no se agrega item para no duplicar (Bloque 10).
// Otros (cursos, foro, certificados) se agregan en sus bloques
// respectivos cuando exista la ruta correspondiente, agregando
// tanto el iconName aqui como su mapeo en nav-icon.tsx.
//
// Orden del sidebar:
// 1. Dashboard (todos los roles, entrada principal).
// 2. Por calificar (solo teacher, accion contextual).
// 3. Admin (solo admin, panel administrativo).
// 4. Perfil (todos los roles, ultimo por convencion estandar).

import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

export type NavIconName = "dashboard" | "shield" | "inbox" | "user";

export interface NavItem {
  label: string;
  href: string;
  iconName: NavIconName;
  allowedRoles: ReadonlyArray<UserRole>;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    iconName: "dashboard",
    allowedRoles: ["admin", "teacher", "student"],
  },
  {
    label: "Por calificar",
    href: "/teacher",
    iconName: "inbox",
    allowedRoles: ["teacher"],
  },
  {
    label: "Admin",
    href: "/admin",
    iconName: "shield",
    allowedRoles: ["admin"],
  },
  {
    label: "Perfil",
    href: "/profile",
    iconName: "user",
    allowedRoles: ["admin", "teacher", "student"],
  },
];

export function getNavigationFor(user: AuthenticatedUser): NavItem[] {
  return NAV_ITEMS.filter((item) => item.allowedRoles.includes(user.role));
}
