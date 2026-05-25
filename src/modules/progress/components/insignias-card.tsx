// InsigniasCard (Bloque 21.6 B2, ajustada 22.1 B): tarjeta del
// dashboard student con las 3 insignias de rango (Junior/Senior/
// Master). Acumulativas: si el student cruza Senior, Junior
// tambien queda en color (ya no se gris-out). Solo los rangos
// superiores no conseguidos quedan en muted.
//
// 22.5: filtra a kind === "rank". El catalogo expandido por 22.2
// incluye 2 achievements (Graduado CNV, Profesional Conectado CNV)
// que requieren badgesService para resolverse correctamente; este
// card del dashboard mantiene el resumen compacto solo de ranks.
// El detalle completo de las 5 insignias vive en /certificates
// (ExpandedBadgesCard).
//
// Tooltip nativo via title attribute:
//   - Conseguida: "Nombre · Conseguida el DD mes YYYY".
//   - No conseguida: "Nombre · Alcanza X% para conseguirla".
//
// Server Component. Reusa BadgeDisplay variant="card".

import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeDisplay } from "./badge-display";
import { ALL_BADGES } from "@/modules/progress/lib";
import { formatBogotaDate } from "@/lib/utils/format-date";
import type { RankEarnedDates } from "@/modules/progress/services/progress.service";

interface InsigniasCardProps {
  progressPercentage: number;
  earnedDates: RankEarnedDates;
}

const DIMMED_COLOR = "bg-muted text-muted-foreground border-transparent";

// Umbral minimo (inclusive) para cada rank id. Mantiene el mapeo
// inverso al getBadge (badges.ts) en un solo lugar para que la
// logica de "esta earned?" sea consistente.
const RANK_THRESHOLD: Record<string, number> = {
  junior: 0,
  senior: 50,
  master: 85,
};

const RANK_DATE_KEY: Record<string, keyof RankEarnedDates> = {
  junior: "juniorAt",
  senior: "seniorAt",
  master: "masterAt",
};

export function InsigniasCard({
  progressPercentage,
  earnedDates,
}: InsigniasCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-600" />
          <h2 className="font-display text-base font-bold tracking-tight">
            Insignias
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {ALL_BADGES.filter((b) => b.kind === "rank").map((badge) => {
            const threshold = RANK_THRESHOLD[badge.id] ?? 0;
            const earned = progressPercentage >= threshold;
            const earnedAt = earned
              ? (earnedDates[RANK_DATE_KEY[badge.id]] ?? null)
              : null;

            const display = earned
              ? badge
              : { ...badge, colorClass: DIMMED_COLOR };

            const tooltip = earned
              ? earnedAt
                ? `${badge.label} · Conseguida el ${formatBogotaDate(earnedAt)}`
                : `${badge.label} · Conseguida`
              : `${badge.label} · Alcanza ${threshold}% para conseguirla`;

            return (
              <span
                key={badge.id}
                title={tooltip}
                className="inline-block"
              >
                <BadgeDisplay badge={display} size="card" />
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
