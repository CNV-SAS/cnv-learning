// BadgeDisplay: insignia visual con icono lucide + label. Server
// Component que mapea badge.iconName (string serializable) al
// componente lucide correspondiente. Mismo patron que nav-icon.tsx
// (3.5-fix): el dominio define icon-string, la UI lo resuelve.
//
// Como es Server Component, importar lucide aqui es seguro: el
// icono se renderiza server-side y solo HTML cruza al cliente.
// NO se pasan componentes React como prop.
//
// Variants:
// - default: CourseCard del dashboard, paginas con titulo grande.
// - sm: usos compactos (header de course view, lista de cursos
//   secundarios futuros).

import { Award, Sparkles, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Badge, BadgeIconName } from "@/modules/progress/lib";

const ICON_MAP: Record<BadgeIconName, LucideIcon> = {
  sparkles: Sparkles,
  award: Award,
  trophy: Trophy,
};

interface BadgeDisplayProps {
  badge: Badge;
  size?: "default" | "sm";
  className?: string;
}

export function BadgeDisplay({
  badge,
  size = "default",
  className,
}: BadgeDisplayProps) {
  const Icon = ICON_MAP[badge.iconName];
  const isSm = size === "sm";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium",
        badge.colorClass,
        isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className,
      )}
    >
      <Icon className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {badge.label}
    </span>
  );
}
