// StatTile (Bloque 21.1): card compacta con label uppercase + valor
// destacado. Usada en el grid 2x2 del dashboard admin (Usuarios,
// Bases de Datos, etc.) y en el HeroCard como chip de stats.

import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  // Si valueColor se especifica, se aplica al value (ej.
  // text-emerald-700 para metricas positivas).
  valueColor?: string;
  // chip: variante para el rightSlot del HeroCard (texto blanco
  // sobre fondo translucido).
  variant?: "card" | "chip";
}

export function StatTile({
  label,
  value,
  valueColor,
  variant = "card",
}: StatTileProps) {
  if (variant === "chip") {
    return (
      <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center">
        <p className="font-display text-2xl font-black tracking-tight">
          {value}
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
          {label}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-2xl font-bold tracking-tight",
          valueColor ?? "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
