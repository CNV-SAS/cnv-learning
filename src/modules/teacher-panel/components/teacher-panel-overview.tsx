// TeacherPanelOverview: render compartido del overview del docente.
// Server Component async. Lo usan:
//   - /teacher/page.tsx (teacher viendo su propio panel).
//   - /admin/teachers/[teacherId]/page.tsx (admin viendo el panel
//     de un docente especifico, refactor del Bloque 14.1).
//
// Recibe el userId del docente como prop. Resuelve courses via
// listForTeacher(userId) + overviews + rosters. El admin invoca
// con cualquier teacherId (RLS admin manage en courses + teachers
// + enrollments lo permite); el teacher invoca con su propio id.
//
// Las CTAs por curso son las mismas para ambos casos. Diferencias
// UX (e.g. mostrar "Eres tu" vs "Estas viendo el panel de X") las
// resuelve el page padre via subtitulos.

import Link from "next/link";
import {
  ExternalLink,
  GraduationCap,
  Inbox,
  Megaphone,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { courseRepository } from "@/modules/courses/data";
import { teacherPanelService } from "@/modules/teacher-panel/services";
import { UpcomingEventsPreview } from "@/modules/calendar/components/upcoming-events-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeacherCourseOverview } from "@/modules/teacher-panel/types";

interface TeacherPanelOverviewProps {
  userId: string;
  emptyMessage: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d MMM y", { locale: es });
}

export async function TeacherPanelOverview({
  userId,
  emptyMessage,
}: TeacherPanelOverviewProps) {
  const courses = await courseRepository.listForTeacher(userId);
  const overviews = await teacherPanelService.getCoursesOverview(courses);

  const rosters = await Promise.all(
    overviews.map((o) =>
      teacherPanelService.getStudentRoster(o.course.id),
    ),
  );

  if (overviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {overviews.map((overview, idx) => (
        <CourseSection
          key={overview.course.id}
          overview={overview}
          roster={rosters[idx]}
        />
      ))}
    </div>
  );
}

function CourseSection({
  overview,
  roster,
}: {
  overview: TeacherCourseOverview;
  roster: Awaited<
    ReturnType<typeof teacherPanelService.getStudentRoster>
  >;
}) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="font-display text-2xl">
            {overview.course.title}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/teacher/inbox">
                <Inbox className="mr-2 h-3.5 w-3.5" />
                Por calificar ({overview.pendingSubmissionsCount})
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/teacher/announce?courseId=${overview.course.id}`}
              >
                <Megaphone className="mr-2 h-3.5 w-3.5" />
                Nuevo anuncio
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/learn/${overview.course.id}`}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Ir al curso
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatBlock
            icon={<Users className="h-4 w-4" />}
            label="Alumnos"
            value={String(overview.studentsCount)}
          />
          <StatBlock
            icon={<GraduationCap className="h-4 w-4" />}
            label="Progreso promedio"
            value={`${overview.averageProgressPercentage}%`}
          />
          <StatBlock
            icon={<Inbox className="h-4 w-4" />}
            label="Entregas pendientes"
            value={String(overview.pendingSubmissionsCount)}
          />
        </div>

        <UpcomingEventsPreview courseId={overview.course.id} limit={3} />

        <section className="space-y-3">
          <h3 className="font-display text-base font-bold tracking-tight">
            Estudiantes
          </h3>
          {roster.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="py-6 text-sm text-muted-foreground">
                Aún no hay estudiantes inscritos en este curso.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Estudiante</th>
                    <th className="px-4 py-3">Progreso</th>
                    <th className="px-4 py-3">Última actividad</th>
                    <th className="px-4 py-3 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roster.map((entry) => (
                    <tr key={entry.userId}>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium">
                          {entry.studentName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.studentEmail}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {entry.progressPercentage}%
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatDate(entry.lastActivityAt)}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            href={`/teacher/students/${entry.userId}?courseId=${overview.course.id}`}
                          >
                            Ver detalle
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="font-display text-lg font-bold tracking-tight">
          {value}
        </span>
      </div>
    </div>
  );
}

