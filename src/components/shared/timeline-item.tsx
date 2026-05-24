// TimelineItem (Bloque 21.1): item de timeline vertical con fecha
// destacada a la izquierda + titulo + chip opcional. Usado en el
// calendario del student. Server Component (sin estado).
//
// La fecha se descompone en day (numero grande) y month (label
// uppercase) en la zona Bogota usando los helpers existentes.

import { cn } from "@/lib/utils";

type ChipColor = "emerald" | "amber" | "blue" | "muted";

interface TimelineItemProps {
  day: string;
  month: string;
  title: string;
  description?: string;
  chipLabel?: string;
  chipColor?: ChipColor;
}

const CHIP_CLASSES: Record<ChipColor, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  muted: "bg-muted text-muted-foreground",
};

export function TimelineItem({
  day,
  month,
  title,
  description,
  chipLabel,
  chipColor = "muted",
}: TimelineItemProps) {
  return (
    <div className="flex items-start gap-6 border-b border-border py-5 last:border-b-0">
      <div className="w-16 shrink-0 text-center">
        <p className="font-display text-3xl font-black tracking-tight text-emerald-700">
          {day}
        </p>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          {month}
        </p>
      </div>
      <div className="flex-1 space-y-2">
        <h3 className="font-display text-base font-bold tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {chipLabel && (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
              CHIP_CLASSES[chipColor],
            )}
          >
            {chipLabel}
          </span>
        )}
      </div>
    </div>
  );
}
