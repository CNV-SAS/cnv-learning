// ExpandedBadgesCard (Bloque 22.5): vista detallada del catalogo de
// 5 insignias para la ruta /certificates. Cada fila incluye:
//   - BadgeDisplay grande (variant card).
//   - Nombre + estado conseguida/por conseguir.
//   - Fecha de obtencion (si conseguida) o requisito (si no).
//   - Descripcion del badge.
//   - Solo para ranks: ProgressBar al siguiente umbral, o mensaje
//     "Rango maximo alcanzado" para Master.
//
// Recibe directamente el resultado de badgesService.getStudentBadges
// (5 entries con earned + earnedAt) + el progressPercentage del curso
// primario para calcular progreso hacia el siguiente rank. Achievements
// no muestran progress bar (son binarios).
//
// Server Component. Reusa BadgeDisplay y ProgressBar.

import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeDisplay } from "./badge-display";
import { ProgressBar } from "@/components/shared/progress-bar";
import { formatBogotaDate } from "@/lib/utils/format-date";
import type { StudentBadgeEntry } from "@/modules/progress/services/badges.service";

// Mapa de umbral inferior y siguiente rank por badge.id. Si la
// insignia no esta conseguida, mostramos "Progreso hacia esta
// insignia" (numerador = pct, denominador = su threshold). Si esta
// conseguida y existe NEXT_RANK, mostramos "Progreso hacia el
// siguiente". Master conseguido = rango maximo.
const RANK_THRESHOLD: Record<string, number> = {
  junior: 0,
  senior: 50,
  master: 85,
};

const NEXT_RANK: Record<string, { threshold: number; label: string }> = {
  junior: { threshold: 50, label: "Senior Medicina Bioeléctrica" },
  senior: { threshold: 85, label: "Master ATLAS" },
};

interface ExpandedBadgesCardProps {
  entries: StudentBadgeEntry[];
  progressPercentage: number;
}

export function ExpandedBadgesCard({
  entries,
  progressPercentage,
}: ExpandedBadgesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mis Insignias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {entries.map((entry) => {
          const { badge, earned, earnedAt } = entry;
          const isRank = badge.kind === "rank";
          const ownThreshold = RANK_THRESHOLD[badge.id] ?? 0;
          const next = isRank ? NEXT_RANK[badge.id] : null;

          return (
            <div
              key={badge.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-4 sm:flex-row sm:items-start sm:gap-4"
            >
              <div className="shrink-0">
                <BadgeDisplay
                  badge={
                    earned
                      ? badge
                      : { ...badge, colorClass: "bg-muted text-muted-foreground border-zinc-300" }
                  }
                  size="card"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-base font-bold">
                    {badge.label}
                  </span>
                  {earned ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Conseguida
                      {earnedAt && (
                        <span className="text-muted-foreground">
                          {" · "}
                          {formatBogotaDate(earnedAt)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Circle className="h-3.5 w-3.5" />
                      Por conseguir
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {earned ? badge.description : badge.requirement}
                </p>
                {isRank && !earned && (
                  <ProgressBar
                    percentage={Math.min(
                      100,
                      Math.max(
                        0,
                        Math.round(
                          (progressPercentage / Math.max(1, ownThreshold)) *
                            100,
                        ),
                      ),
                    )}
                    label={`Progreso hacia ${badge.label} (${ownThreshold}%)`}
                    showPercentage
                  />
                )}
                {isRank && earned && next && (
                  <ProgressBar
                    percentage={Math.min(
                      100,
                      Math.max(
                        0,
                        Math.round(
                          ((progressPercentage - ownThreshold) /
                            (next.threshold - ownThreshold)) *
                            100,
                        ),
                      ),
                    )}
                    label={`Progreso hacia ${next.label} (${next.threshold}%)`}
                    showPercentage
                  />
                )}
                {isRank && earned && !next && (
                  <p className="text-xs font-medium text-amber-700">
                    Has alcanzado el rango máximo del curso.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
