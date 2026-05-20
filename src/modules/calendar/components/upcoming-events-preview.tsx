// Preview compacto de proximos N eventos del curso. Server Component.
// Usado por el panel docente (Bloque 13) para reemplazar el bloque
// estatico de starts_at/ends_at del curso con datos vivos del
// calendario. Consideracion A2 del plan B15:
// starts_at >= CURRENT_DATE ORDER BY starts_at ASC LIMIT 3.
//
// Eventos pasados NO aparecen aqui (esos viven en la vista completa
// /learn/[courseId]/calendar con tratamiento muted).

import Link from "next/link";
import { ArrowRight, CalendarRange } from "lucide-react";
import { courseEventRepository } from "@/modules/calendar/data";
import { formatBogotaDate } from "@/lib/utils/format-date";
import { Button } from "@/components/ui/button";

interface UpcomingEventsPreviewProps {
  courseId: string;
  limit?: number;
}

function formatRange(startsAt: string, endsAt: string | null): string {
  const start = formatBogotaDate(`${startsAt}T00:00:00.000Z`);
  if (!endsAt || endsAt === startsAt) return start;
  const end = formatBogotaDate(`${endsAt}T00:00:00.000Z`);
  return `${start} → ${end}`;
}

export async function UpcomingEventsPreview({
  courseId,
  limit = 3,
}: UpcomingEventsPreviewProps) {
  const events = await courseEventRepository.listUpcomingByCourse(
    courseId,
    limit,
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-base font-bold tracking-tight">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          Próximos eventos
        </h3>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/learn/${courseId}/calendar`}>
            Ver calendario
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          No hay eventos próximos. Crea uno desde el calendario.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="text-sm font-medium">{e.title}</div>
              <div className="text-xs text-muted-foreground">
                {formatRange(e.starts_at, e.ends_at)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
