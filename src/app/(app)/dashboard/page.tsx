// Dashboard accesible para los 3 roles. Branch por rol para listar
// cursos accesibles.
//
//   - Student: listForUser (filtra por enrollment activo) +
//     progressService para progreso propio + CourseCard con
//     summary completo. Bloque 21.2 agrego HeroCard verde y
//     Bloque 21.6 ajusto los chips: badge actual + proximo evento
//     (<=7 dias), evitando duplicar el ProgressBar del CourseCard.
//     21.6 B2: card de Insignias al lado del CourseCard en lg+.
//
//   - Teacher: listForTeacher. h1 simple aqui; el panel docente
//     completo con cohort stats vive en /teacher.
//
//   - Admin: listAllAccessible. 21.6 F1: HeroCard dark + CourseCards.
//     Las metricas globales (Usuarios, Certificados, etc.) viven en
//     /admin para no duplicar.

import { redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { progressService } from "@/modules/progress/services/progress.service";
import { certificateRepository } from "@/modules/certificates/data";
import { courseEventRepository } from "@/modules/calendar/data";
import { CourseCard } from "@/modules/courses/components/course-card";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroCard } from "@/components/shared/hero-card";
import { StatTile } from "@/components/shared/stat-tile";
import { InsigniasCard } from "@/modules/progress/components";
import { formatBogotaDateOnly } from "@/lib/utils/format-date";
import type { CourseSummary } from "@/modules/progress/services/progress.service";
import type { Certificate } from "@/modules/certificates/types";
import { getDisplayName } from "@/lib/utils/format";

export default async function DashboardPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const isStudent = user.role === "student";
  const isAdmin = user.role === "admin";
  const courses =
    user.role === "student"
      ? await courseRepository.listForUser(user.id)
      : user.role === "teacher"
        ? await courseRepository.listForTeacher(user.id)
        : await courseRepository.listAllAccessible();

  const [summaries, certificates] = await Promise.all([
    isStudent
      ? Promise.all(
          courses.map((course) =>
            progressService.getCourseSummary(user.id, course.id),
          ),
        )
      : Promise.resolve(courses.map(() => null) as Array<CourseSummary | null>),
    isStudent
      ? certificateRepository.listForUser(user.id)
      : Promise.resolve([] as Certificate[]),
  ]);
  const certByCourseId = new Map(
    certificates.map((c) => [c.course_id, c]),
  );

  const emptyTitle = isStudent
    ? "Aún no estás inscrito en ningún curso"
    : user.role === "teacher"
      ? "Aún no tienes cursos asignados"
      : "Aún no hay cursos en el sistema";

  // 21.6 B1: chips del hero student = badge actual + proximo evento.
  // Badge: del summary del primer curso (en MVP hay 1 curso por
  // student). Proximo evento: oculto si > 7 dias o no hay eventos.
  const studentBadge =
    isStudent && summaries.length > 0
      ? (summaries[0]?.badge ?? null)
      : null;

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const studentNextEvent =
    isStudent && courses.length > 0
      ? await courseEventRepository
          .listUpcomingByCourse(courses[0].id, 1)
          .then((events) => events[0] ?? null)
      : null;

  const studentNextEventChip = (() => {
    if (!studentNextEvent) return null;
    // starts_at es YYYY-MM-DD. Diff de dias entre noons locales
    // para no incurrir en el shift UTC->Bogota del bug calendar.
    const eventDate = new Date(`${studentNextEvent.starts_at}T12:00:00`);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diff = eventDate.getTime() - today.getTime();
    if (diff < 0 || diff > SEVEN_DAYS_MS) return null;
    return {
      label: "Próximo evento",
      value: formatBogotaDateOnly(studentNextEvent.starts_at),
    };
  })();

  // 21.6 B2: layout 2-col para student con 1 curso (CourseCard +
  // InsigniasCard). Multi-curso (raro en MVP) cae al grid uniforme
  // de CourseCards con la InsigniasCard arriba como single row.
  const studentHasSingleCourse = isStudent && courses.length === 1;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {isStudent ? (
        <HeroCard
          variant="green"
          title={`¡Bienvenido, ${getDisplayName(user)}!`}
          subtitle={
            studentBadge
              ? `Rango actual: ${studentBadge.label}`
              : "Te damos la bienvenida a CNV Learning."
          }
          rightSlot={
            <>
              {studentBadge && (
                <StatTile
                  variant="chip"
                  label="Insignia"
                  value={studentBadge.label.split(" ")[0]}
                />
              )}
              {studentNextEventChip && (
                <StatTile
                  variant="chip"
                  label={studentNextEventChip.label}
                  value={studentNextEventChip.value}
                />
              )}
            </>
          }
        />
      ) : isAdmin ? (
        <HeroCard
          variant="dark"
          title="System Administrator"
          subtitle="Catálogo de cursos del sistema."
        />
      ) : (
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-black tracking-tight">
            Hola, {getDisplayName(user)}
          </h1>
          <p className="text-sm text-muted-foreground">
            Te damos la bienvenida a CNV Learning.
          </p>
        </div>
      )}

      {courses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{emptyTitle}</CardTitle>
            <CardDescription>
              Si crees que es un error, contacta a soporte en{" "}
              <a
                href="mailto:soporte@cnvsystem.com"
                className="underline hover:text-foreground"
              >
                soporte@cnvsystem.com
              </a>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      ) : studentHasSingleCourse && studentBadge ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <CourseCard
            course={courses[0]}
            summary={summaries[0]}
            certificate={certByCourseId.get(courses[0].id) ?? null}
          />
          <InsigniasCard currentBadgeId={studentBadge.id} />
        </div>
      ) : (
        <>
          {isStudent && studentBadge && (
            <InsigniasCard currentBadgeId={studentBadge.id} />
          )}
          <div className="grid gap-6 md:grid-cols-2">
            {courses.map((course, idx) => (
              <CourseCard
                key={course.id}
                course={course}
                summary={summaries[idx]}
                certificate={certByCourseId.get(course.id) ?? null}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
