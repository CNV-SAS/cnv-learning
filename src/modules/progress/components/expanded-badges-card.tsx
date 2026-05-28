// ExpandedBadgesCard (Bloque 22.5): vista detallada del catalogo de
// insignias para la ruta /certificates. Cada fila incluye:
//   - BadgeDisplay grande (variant card).
//   - Nombre + estado conseguida/por conseguir.
//   - Fecha de obtencion (si conseguida) o requisito (si no).
//   - Descripcion del badge.
//   - Solo para ranks: ProgressBar al siguiente umbral, o mensaje
//     "Rango maximo alcanzado" para Master.
//
// Bloque 23 smoke fix AJUSTE 6: agrupacion visual en 2 secciones:
//   1. Rangos del Diplomado de Medicina Bioeléctrica y Sistema ANI
//      BIS-E (Junior/Senior/Master), aplican al curso especifico.
//   2. Logros CNV (Graduado, Explorador, Maestro CNV, Pro CNV),
//      transversales al ecosistema. Orden de menor a mayor
//      escalabilidad.
//
// Recibe directamente el resultado de badgesService.getStudentBadges
// (7 entries con earned + earnedAt) + el progressPercentage del curso
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

function BadgeRow({
  entry,
  progressPercentage,
}: {
  entry: StudentBadgeEntry;
  progressPercentage: number;
}) {
  const { badge, earned, earnedAt } = entry;
  const isRank = badge.kind === "rank";
  const ownThreshold = RANK_THRESHOLD[badge.id] ?? 0;
  const next = isRank ? NEXT_RANK[badge.id] : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-4 sm:flex-row sm:items-start sm:gap-4">
      <div className="shrink-0">
        <BadgeDisplay
          badge={
            earned
              ? badge
              : {
                  ...badge,
                  colorClass:
                    "bg-muted text-muted-foreground border-zinc-300",
                }
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
                  (progressPercentage / Math.max(1, ownThreshold)) * 100,
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
}

export function ExpandedBadgesCard({
  entries,
  progressPercentage,
}: ExpandedBadgesCardProps) {
  // 23 smoke fix AJUSTE 6: separar ranks (Diplomado MBI + ANI BIS-E)
  // de achievements (Logros CNV) para que el student entienda el
  // alcance de cada grupo. El orden dentro de cada grupo lo da
  // ALL_BADGES (badges.ts) y badgesService.getStudentBadges lo
  // preserva.
  const ranks = entries.filter((e) => e.badge.kind === "rank");
  const achievements = entries.filter((e) => e.badge.kind === "achievement");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mis Insignias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {ranks.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Rango en el Diplomado de Medicina Bioeléctrica y Sistema
              ANI BIS-E
            </h3>
            <div className="space-y-3">
              {ranks.map((entry) => (
                <BadgeRow
                  key={entry.badge.id}
                  entry={entry}
                  progressPercentage={progressPercentage}
                />
              ))}
            </div>
          </section>
        )}
        {achievements.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Logros CNV
            </h3>
            <div className="space-y-3">
              {achievements.map((entry) => (
                <BadgeRow
                  key={entry.badge.id}
                  entry={entry}
                  progressPercentage={progressPercentage}
                />
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
