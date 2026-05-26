"use client";

// SidebarItem (Bloque 21.1 redesign): link individual del sidebar
// con active state via usePathname y styling del prototipo Gildardo:
// uppercase font-black tracking-widest, item activo con fondo emerald
// solido y texto blanco.
//
// Active state (Bloque 22.7 fix Bug C del smoke): "best match wins".
// Antes la regla era pathname.startsWith(href + "/"), lo cual hacia
// que /admin/status activara TAMBIEN el item /admin (ambos prefix).
// Ahora el SidebarItem recibe la lista completa de hrefs y se
// declara activo solo si su href es el match mas largo. /admin/status
// gana sobre /admin cuando estas en /admin/status; /admin sigue
// activo en /admin/users (porque no hay /admin/users en sidebar y
// /admin es el unico que matchea).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/modules/auth/policies/navigation";
import { NavIcon } from "./nav-icon";

interface SidebarItemProps {
  item: NavItem;
  allHrefs: readonly string[];
}

function findBestMatch(
  pathname: string,
  hrefs: readonly string[],
): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (!matches) continue;
    if (!best || href.length > best.length) best = href;
  }
  return best;
}

export function SidebarItem({ item, allHrefs }: SidebarItemProps) {
  const pathname = usePathname();
  const bestMatch = findBestMatch(pathname, allHrefs);
  const isActive = bestMatch === item.href;

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
