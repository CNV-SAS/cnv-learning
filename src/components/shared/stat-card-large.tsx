// StatCardLarge (Bloque 21.1): card grande con icono + título +
// número enorme + subtítulo opcional. Usada en el dashboard del
// docente para "Rendimiento Global 89.4%" y "Progreso promedio 92%".
// Color del valor: emerald (positivo) o blue (informativo).

import { cn } from "@/lib/utils";

type Color = "emerald" | "blue";

interface StatCardLargeProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  color?: Color;
}

const VALUE_COLOR: Record<Color, string> = {
  emerald: "text-emerald-700",
  blue: "text-blue-600",
};

const ICON_COLOR: Record<Color, string> = {
  emerald: "text-emerald-700",
  blue: "text-blue-600",
};

export function StatCardLarge({
  icon,
  title,
  value,
  subtitle,
  color = "emerald",
}: StatCardLargeProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div
        className={cn(
          "flex items-center gap-2 text-sm font-semibold",
          ICON_COLOR[color],
        )}
      >
        {icon}
        <span className="text-foreground">{title}</span>
      </div>
      <p
        className={cn(
          "mt-3 font-display text-5xl font-black tracking-tight",
          VALUE_COLOR[color],
        )}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs font-black uppercase tracking-widest text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}
