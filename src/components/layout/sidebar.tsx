// Sidebar (Bloque 21 redesign + 21.6 ajuste post-smoke): contenido
// del menu lateral. Server Component. Recibe items pre-filtrados
// por la policy de navigation + el rol del user para el RoleLabel.
//
// Layout: Wordmark (Link a /dashboard) + RoleLabel arriba, nav
// items abajo. Logout vive en UserDropdown del header (decision
// 21.6: el SidebarLogoutButton agresivo se removio por contraste
// visual; el patron UserDropdown del MVP preserva mejor UX).
//
// NO incluye wrapper <aside> ni clases de visibility. El (app)/
// layout.tsx decide el chrome: aside fijo desktop + Sheet mobile.

import Link from "next/link";
import { Wordmark } from "@/components/shared/wordmark";
import type { NavItem } from "@/modules/auth/policies/navigation";
import type { UserRole } from "@/modules/auth/types";
import { RoleLabel } from "./role-label";
import { SidebarItem } from "./sidebar-item";

interface SidebarProps {
  items: NavItem[];
  role: UserRole;
}

export function Sidebar({ items, role }: SidebarProps) {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="space-y-2">
        <Link href="/dashboard" aria-label="Ir al dashboard">
          <Wordmark />
        </Link>
        <RoleLabel role={role} />
      </div>
      <nav
        className="flex flex-col gap-1"
        aria-label="Navegación principal"
      >
        {items.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            allHrefs={items.map((i) => i.href)}
          />
        ))}
      </nav>
    </div>
  );
}
