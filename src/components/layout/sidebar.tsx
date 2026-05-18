// Sidebar: contenido del menu lateral. Server Component, recibe la
// lista de items ya filtrados por la policy de navigation (regla
// dura 3 de ARCHITECTURE.md: no se compara user.role aqui, el
// caller pasa lo que el user puede ver).
//
// NO incluye wrapper <aside> ni clases de visibility. El (app)/
// layout.tsx decide el chrome: aside fijo desktop + Sheet mobile.
// Esa separacion permite reusar este mismo componente dentro del
// MobileNav Sheet sin duplicar markup.

import { Wordmark } from "@/components/shared/wordmark";
import { SidebarItem, type NavItem } from "./sidebar-item";

interface SidebarProps {
  items: NavItem[];
}

export function Sidebar({ items }: SidebarProps) {
  return (
    <div className="flex h-full flex-col gap-8 p-6">
      <Wordmark />
      <nav className="flex flex-col gap-1" aria-label="Navegación principal">
        {items.map((item) => (
          <SidebarItem key={item.href} item={item} />
        ))}
      </nav>
    </div>
  );
}
