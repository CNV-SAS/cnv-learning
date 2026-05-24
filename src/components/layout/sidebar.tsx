// Sidebar (Bloque 21.1 redesign): contenido del menu lateral. Server
// Component. Recibe items pre-filtrados por la policy de navigation
// + el rol del user para el RoleLabel y el SidebarLogoutButton.
//
// Layout: Wordmark + RoleLabel arriba, nav items en medio (flex-1),
// SidebarLogoutButton abajo. Replica el shape del prototipo
// (Gildardo).
//
// NO incluye wrapper <aside> ni clases de visibility. El (app)/
// layout.tsx decide el chrome: aside fijo desktop + Sheet mobile.

import { Wordmark } from "@/components/shared/wordmark";
import type { NavItem } from "@/modules/auth/policies/navigation";
import type { UserRole } from "@/modules/auth/types";
import { RoleLabel } from "./role-label";
import { SidebarItem } from "./sidebar-item";
import { SidebarLogoutButton } from "./sidebar-logout-button";

interface SidebarProps {
  items: NavItem[];
  role: UserRole;
}

export function Sidebar({ items, role }: SidebarProps) {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="space-y-2">
        <Wordmark />
        <RoleLabel role={role} />
      </div>
      <nav
        className="flex flex-1 flex-col gap-1"
        aria-label="Navegación principal"
      >
        {items.map((item) => (
          <SidebarItem key={item.href} item={item} />
        ))}
      </nav>
      <SidebarLogoutButton />
    </div>
  );
}
