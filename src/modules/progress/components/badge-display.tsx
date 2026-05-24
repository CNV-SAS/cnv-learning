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
//   - default: pillow grande para titulos.
//   - sm: pillow compacto inline.
//   - card: tarjeta cuadrada con icon centrado (Bloque 21.2,
//     prototipo Gildardo "Insignias" del dashboard student).

import { Award, Sparkles, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Badge, BadgeIconName } from "@/modules/progress/lib";

const ICON_MAP: Record<BadgeIconName, LucideIcon> = {
  sparkles: Sparkles,
  award: Award,
  trophy: Trophy,
};

type Size = "default" | "sm" | "card";

interface BadgeDisplayProps {
  badge: Badge;
  size?: Size;
  className?: string;
}

export function BadgeDisplay({
  badge,
  size = "default",
  className,
}: BadgeDisplayProps) {
  const Icon = ICON_MAP[badge.iconName];

  if (size === "card") {
    return (
      <div
        className={cn(
          "flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 text-center",
          badge.colorClass,
          className,
        )}
      >
        <Icon className="h-7 w-7" />
        <span className="text-[10px] font-black uppercase tracking-widest leading-tight">
          {badge.label}
        </span>
      </div>
    );
  }

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
