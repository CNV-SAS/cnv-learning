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
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarItemProps {
  item: NavItem;
}

export function SidebarItem({ item }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

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
      <Icon className="h-5 w-5" />
      <span>{item.label}</span>
    </Link>
  );
}
