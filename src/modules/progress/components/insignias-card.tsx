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

export function InsigniasCard({ entries }: InsigniasCardProps) {
  // CORRECCION 9: filtrar showInDashboard Y earned. Las no conseguidas
  // viven en /certificates (ExpandedBadgesCard), no en el dashboard.
  const visible = entries.filter(
    (e) => e.badge.showInDashboard && e.earned,
  );
  const ranks = visible.filter((e) => e.badge.kind === "rank");
  const achievements = visible.filter((e) => e.badge.kind === "achievement");
  const hasNone = ranks.length === 0 && achievements.length === 0;

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
            {/* Bloque post-23 ISSUE 2: grid responsive 2/3/4 cols
                acomoda mejor las insignias cuando hay 4 (el flex-wrap
                anterior dejaba 3+1 desbalanceado). Mobile 2x2, sm
                3 por fila, md+ 4 por fila. justify-items-center
                centra la card dentro de su celda cuando la celda es
                mas ancha que la badge (w-28 fixed). */}
            {ranks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Diplomado de Medicina Bioeléctrica y ANI BIS-E
                </p>
                <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 md:grid-cols-4">
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
                <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 md:grid-cols-4">
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
