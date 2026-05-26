// InsigniasCard (Bloque 21.6 B2, ajustada 22.1/22.5/22.14): tarjeta
// del dashboard student con las insignias relevantes al cohorte
// actual (3 ranks + Graduado + Profesional Conectado CNV = 5).
//
// 22.14: refactor para recibir directamente las entries del
// badgesService (pre-resueltas con earned + earnedAt). Antes recibia
// progressPercentage + earnedDates y solo evaluaba ranks; eso
// dejaba a los achievements (Graduado, Pro CNV) fuera del card del
// dashboard. Ahora el caller (dashboard page) llama
// badgesService.getStudentBadges, filtra por showInDashboard=true y
// pasa el array directamente.
//
// Las insignias por count de cursos (Explorador CNV, Maestro CNV)
// quedan fuera del filtro (showInDashboard=false) y solo aparecen
// en /certificates.
//
// Tooltip nativo via title attribute:
//   - Conseguida: "Nombre · Conseguida el DD mes YYYY" (si fecha)
//     o "Nombre · Conseguida" (si no hay fecha trackeada).
//   - No conseguida: "Nombre · requirement" (texto del badge).
//
// Server Component. Reusa BadgeDisplay variant="card".

import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeDisplay } from "./badge-display";
import { formatBogotaDate } from "@/lib/utils/format-date";
import type { StudentBadgeEntry } from "@/modules/progress/services/badges.service";

// 22.14: border gris visible (no transparente) cuando la insignia
// no esta conseguida. Mantiene la identidad visual del card como
// "tarjeta de insignia" aun en estado dimmed.
const DIMMED_COLOR =
  "bg-muted text-muted-foreground border-zinc-300";

interface InsigniasCardProps {
  entries: StudentBadgeEntry[];
}

export function InsigniasCard({ entries }: InsigniasCardProps) {
  const visible = entries.filter((e) => e.badge.showInDashboard);

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
          {visible.map(({ badge, earned, earnedAt }) => {
            const display = earned
              ? badge
              : { ...badge, colorClass: DIMMED_COLOR };

            const tooltip = earned
              ? earnedAt
                ? `${badge.label} · Conseguida el ${formatBogotaDate(earnedAt)}`
                : `${badge.label} · Conseguida`
              : `${badge.label} · ${badge.requirement}`;

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
