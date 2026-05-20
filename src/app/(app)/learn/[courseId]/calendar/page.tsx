// /learn/[courseId]/calendar: vista del calendario del curso.
// URL unica con UI discriminada por canEditCalendar (decision E del
// plan B15):
//   - Read-only (student enrolled): lista de eventos sin acciones.
//   - Editable (teacher del curso + admin): lista con botones
//     Editar/Eliminar por row + CTA "Nuevo evento" en header.
//
// Eventos pasados (starts_at < hoy) se muestran con opacity-60
// (decision A3) como referencia historica sin competir
// visualmente con los futuros.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { enrollmentRepository } from "@/modules/enrollments/data";
import { courseEventRepository } from "@/modules/calendar/data";
import {
  canEditCalendar,
  canViewCalendar,
} from "@/modules/calendar/policies";
import { EventFormDialog } from "@/modules/calendar/components/event-form-dialog";
import { DeleteEventDialog } from "@/modules/calendar/components/delete-event-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatBogotaDate } from "@/lib/utils/format-date";
import { requireUuidParam } from "@/lib/utils/params";
import type { CourseEvent } from "@/modules/calendar/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatRange(startsAt: string, endsAt: string | null): string {
  const start = formatBogotaDate(`${startsAt}T00:00:00.000Z`);
  if (!endsAt || endsAt === startsAt) return start;
  const end = formatBogotaDate(`${endsAt}T00:00:00.000Z`);
  return `${start} → ${end}`;
}

export default async function CourseCalendarPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const courseId = requireUuidParam((await params).courseId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const course = await courseRepository.findById(courseId);
  if (!course) notFound();

  // Resolver contexto de policies en paralelo. enrollment lookup
  // solo aplica si el user es student (teacher/admin no se enrollan).
  const [isTeacherOfCourse, isEnrolledInCourse] = await Promise.all([
    user.role === "teacher"
      ? courseRepository.isTeacherOfCourse(user.id, courseId)
      : Promise.resolve(false),
    user.role === "student"
      ? enrollmentRepository
          .findActiveByUserAndCourse(user.id, courseId)
          .then((e) => e !== null)
      : Promise.resolve(false),
  ]);

  if (
    !canViewCalendar(user, { isEnrolledInCourse, isTeacherOfCourse })
  ) {
    notFound();
  }

  const canEdit = canEditCalendar(user, { isTeacherOfCourse });
  const events = await courseEventRepository.listByCourse(courseId);
  const today = todayIso();
  const upcoming = events.filter((e) => e.starts_at >= today);
  const past = events.filter((e) => e.starts_at < today);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href={`/learn/${courseId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al curso
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl font-black tracking-tight">
              <CalendarRange className="h-7 w-7 text-emerald-700" />
              Calendario
            </h1>
            <p className="text-sm text-muted-foreground">
              Fechas importantes del curso{" "}
              <span className="font-medium text-foreground">
                {course.title}
              </span>
              .
            </p>
          </div>
          {canEdit && (
            <EventFormDialog mode="create" courseId={courseId} />
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            {canEdit
              ? "Aún no hay eventos en el calendario. Crea el primero con el botón de arriba."
              : "Aún no hay eventos en el calendario de este curso."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <EventSection
              title="Próximos eventos"
              events={upcoming}
              canEdit={canEdit}
              courseId={courseId}
              muted={false}
            />
          )}
          {past.length > 0 && (
            <EventSection
              title="Eventos pasados"
              events={past}
              canEdit={canEdit}
              courseId={courseId}
              muted={true}
            />
          )}
        </div>
      )}
    </div>
  );
}

function EventSection({
  title,
  events,
  canEdit,
  courseId,
  muted,
}: {
  title: string;
  events: CourseEvent[];
  canEdit: boolean;
  courseId: string;
  muted: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        <Badge variant="secondary" className="text-[10px]">
          {events.length}
        </Badge>
      </div>
      <ul className="space-y-3">
        {events.map((event) => (
          <li
            key={event.id}
            className={`rounded-xl border border-border bg-card px-4 py-4 ${
              muted ? "opacity-60" : ""
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-xs font-medium uppercase tracking-widest text-emerald-700">
                  {formatRange(event.starts_at, event.ends_at)}
                </p>
                {event.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <EventFormDialog
                    mode="edit"
                    courseId={courseId}
                    eventId={event.id}
                    initialTitle={event.title}
                    initialDescription={event.description ?? ""}
                    initialStartsAt={event.starts_at}
                    initialEndsAt={event.ends_at ?? ""}
                  />
                  <DeleteEventDialog
                    eventId={event.id}
                    courseId={courseId}
                    eventTitle={event.title}
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
