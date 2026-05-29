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
// 23 smoke fix CORRECCION 9: el dashboard solo muestra insignias
// CONSEGUIDAS (earned=true). Las no conseguidas (placeholder gris)
// ya no aparecen aqui; viven en /certificates ExpandedBadgesCard
// donde el student ve el catalogo completo con progreso al siguiente
// umbral. Si el student no tiene ninguna ganada todavia, mostramos
// un mensaje sutil orientador.
//
// Las insignias por count de cursos (Explorador CNV, Maestro CNV)
// quedan fuera del filtro showInDashboard y solo aparecen en
// /certificates.
//
// Tooltip nativo via title attribute con nombre + fecha de obtencion.
//
// Server Component. Reusa BadgeDisplay variant="card".

import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeDisplay } from "./badge-display";
import { formatBogotaDate } from "@/lib/utils/format-date";
import type { StudentBadgeEntry } from "@/modules/progress/services/badges.service";

interface InsigniasCardProps {
  entries: StudentBadgeEntry[];
}

// 23 smoke fix AJUSTE 7 + CORRECCION 9: agrupar las insignias en 2
// sub-secciones (ranks vs achievements) y mostrar solo las
// conseguidas (earned=true). Solo los ranks llevan subtitulo
// aclaratorio del scope (diplomado especifico). Si no hay ninguna
// conseguida, mensaje sutil orientador.
function BadgeRow({ entry }: { entry: StudentBadgeEntry }) {
  const { badge, earnedAt } = entry;
  // entry.earned siempre true en este flujo (filtrado upstream); el
  // tooltip muestra la fecha de obtencion.
  const tooltip = earnedAt
    ? `${badge.label} · Conseguida el ${formatBogotaDate(earnedAt)}`
    : `${badge.label} · Conseguida`;
  return (
    <span title={tooltip} className="inline-block">
      <BadgeDisplay badge={badge} size="card" />
    </span>
  );
}

// Smoke E2E post-ISSUE-3 VISUAL 3: el grid se adapta al numero de
// badges conseguidos para evitar layouts desbalanceados (3 badges en
// grid-cols-2 dejaba 2+1). Regla por sub-grupo (ranks / achievements):
//   - 1-2 badges: grid-cols-2.
//   - 3 badges: grid-cols-3.
//   - 4+ badges: grid-cols-2 sm:grid-cols-4 (responsive).
function gridColsFor(count: number): string {
  if (count >= 4) return "grid grid-cols-2 sm:grid-cols-4";
  if (count === 3) return "grid grid-cols-3";
  return "grid grid-cols-2";
}

export function InsigniasCard({ entries }: InsigniasCardProps) {
  // CORRECCION 9: filtrar showInDashboard Y earned. Las no conseguidas
  // viven en /certificates (ExpandedBadgesCard), no en el dashboard.
  const visible = entries.filter(
    (e) => e.badge.showInDashboard && e.earned,
  );
  const ranks = visible.filter((e) => e.badge.kind === "rank");
  const achievements = visible.filter((e) => e.badge.kind === "achievement");
  const hasNone = ranks.length === 0 && achievements.length === 0;
  const ranksGridCls = gridColsFor(ranks.length);
  const achievementsGridCls = gridColsFor(achievements.length);

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-600" />
          <h2 className="font-display text-base font-bold tracking-tight">
            Insignias
          </h2>
        </div>
        {hasNone ? (
          <p className="text-sm text-muted-foreground">
            Completa lecciones para ganar insignias.
          </p>
        ) : (
          <>
            {/* Smoke E2E post-ISSUE-3 VISUAL 3: ranksGridCls /
                achievementsGridCls calculan el numero de columnas
                segun el conteo conseguido para mantener una sola fila
                cuando los badges caben. justify-items-center centra
                la card cuando la celda es mas ancha que la badge
                (w-28 fixed). */}
            {ranks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Diplomado de Medicina Bioeléctrica y ANI BIS-E
                </p>
                <div
                  className={`${ranksGridCls} justify-items-center gap-3`}
                >
                  {ranks.map((entry) => (
                    <BadgeRow key={entry.badge.id} entry={entry} />
                  ))}
                </div>
              </div>
            )}
            {achievements.length > 0 && (
              <div className="space-y-2">
                {/* Logros CNV no llevan subtitulo: son transversales
                    al ecosistema y no requieren aclarar scope. */}
                <div
                  className={`${achievementsGridCls} justify-items-center gap-3`}
                >
                  {achievements.map((entry) => (
                    <BadgeRow key={entry.badge.id} entry={entry} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
