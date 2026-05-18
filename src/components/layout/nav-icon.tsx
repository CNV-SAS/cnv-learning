"use client";

// NavIcon: resuelve NavIconName (string literal del catalogo de
// navigation policy) al componente lucide correspondiente. Vive en
// Client Component porque los iconos lucide son funciones React que
// no se pueden serializar a traves de la frontera Server -> Client.
//
// Cada vez que se agregue un nuevo iconName en
// modules/auth/policies/navigation.ts, se agrega aqui el mapeo. El
// type NavIconName en la policy asegura exhaustividad: si falta una
// key del Record, TypeScript falla en compile time.

import { Inbox, LayoutDashboard, Shield, type LucideIcon } from "lucide-react";
import type { NavIconName } from "@/modules/auth/policies/navigation";

const ICON_MAP: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  shield: Shield,
  inbox: Inbox,
};

interface NavIconProps {
  name: NavIconName;
  className?: string;
}

export function NavIcon({ name, className }: NavIconProps) {
  const Icon = ICON_MAP[name];
  return <Icon className={className} />;
}
