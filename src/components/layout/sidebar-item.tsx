"use client";

// SidebarItem: link individual del sidebar con active state via
// usePathname. Es el unico componente Client del trio sidebar +
// sidebar-item + sidebar mobile; el contenedor (Sidebar) puede
// quedar Server porque solo mapea props a items.
//
// Active state: match exacto o prefix (pathname.startsWith(href + "/"))
// para soportar rutas anidadas (ej /admin matchea /admin/users en el
// futuro). En MVP los items son flat asi que el comportamiento es
// equivalente, pero el prefix-match es free.

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
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <NavIcon name={item.iconName} className="h-5 w-5" />
      <span>{item.label}</span>
    </Link>
  );
}
