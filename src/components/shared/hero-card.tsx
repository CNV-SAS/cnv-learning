// HeroCard (Bloque 21.1): tarjeta hero grande para el top de
// dashboards. Variants:
//   - green: dashboard student ("¡Bienvenido, X!").
//   - dark: dashboard admin ("System Administrator").
// Server Component (sin estado). Slot derecho opcional para stats
// (chips, contadores) que float a la derecha en desktop.

import { cn } from "@/lib/utils";

type Variant = "green" | "dark";

interface HeroCardProps {
  variant: Variant;
  title: string;
  subtitle?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  green: "bg-emerald-800 text-white",
  dark: "bg-slate-900 text-white",
};

const SUBTITLE_CLASSES: Record<Variant, string> = {
  green: "text-emerald-100/80",
  dark: "text-slate-300",
};

export function HeroCard({
  variant,
  title,
  subtitle,
  rightSlot,
}: HeroCardProps) {
  return (
    <div className={cn("rounded-2xl px-8 py-8", VARIANT_CLASSES[variant])}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-black tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <div className={cn("text-sm", SUBTITLE_CLASSES[variant])}>
              {subtitle}
            </div>
          )}
        </div>
        {rightSlot && (
          <div className="flex flex-wrap items-center gap-3">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}
