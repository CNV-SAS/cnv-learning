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

import {
  Award,
  Compass,
  Crown,
  GraduationCap,
  Network,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Badge, BadgeIconName } from "@/modules/progress/lib";

// Bloque 22.7 fix Bug F4: "pro-cnv" mapea a Network (red de
// profesionales) en lugar de Shield. 22.14 agrega Compass para
// Explorador CNV (5 cursos) y Crown para Maestro CNV (10 cursos).
const ICON_MAP: Record<BadgeIconName, LucideIcon> = {
  sparkles: Sparkles,
  award: Award,
  trophy: Trophy,
  "graduation-cap": GraduationCap,
  "pro-cnv": Network,
  compass: Compass,
  crown: Crown,
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
    // Bloque 22.7 fix Bug F2: ancho fijo w-28 (112px) y padding p-3
    // para que labels largos ("Bioimpedancia", "Medicina Bioelectrica")
    // no toquen los bordes. Altura h-28 mantiene aspecto cuadrado.
    return (
      <div
        className={cn(
          "flex h-28 w-28 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center",
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
