"use client";

// SidebarItem (Bloque 21.1 redesign): link individual del sidebar
// con active state via usePathname y styling del prototipo Gildardo:
// uppercase font-black tracking-widest, item activo con fondo emerald
// solido y texto blanco.
//
// Active state: match exacto o prefix (pathname.startsWith(href + "/"))
// para soportar rutas anidadas (ej /admin matchea /admin/users).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/modules/auth/policies/navigation";
import { NavIcon } from "./nav-icon";

interface SidebarItemProps {
  item: NavItem;
}

export function SidebarItem({ item }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest transition-colors",
        isActive
          ? "bg-emerald-700 text-white"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <NavIcon name={item.iconName} className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}
