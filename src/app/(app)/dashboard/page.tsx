// Dashboard accesible para los 3 roles. Branch por rol para listar
// cursos accesibles.
//
//   - Student: listForUser (filtra por enrollment activo) +
//     progressService para progreso propio + CourseCard con
//     summary completo (ProgressBar, BadgeDisplay, continueLesson).
//
//   - Teacher: listForTeacher (filtra estricto contra
//     course_teachers). Fix del BUG A/B del smoke 14.11: la
//     version anterior usaba listAllAccessible que confiaba en
//     RLS, pero la policy "Authenticated users view published
//     courses" deja a cualquier teacher ver cursos publicados
//     aunque no este asignado. Resultado: el teacher veia cursos
//     fantasma en su dashboard con modulos vacios al entrar.
//     listForTeacher consulta course_teachers directamente y
//     refleja la asignacion real (igual que /teacher del
//     Bloque 13).
//
//   - Admin: listAllAccessible. Admin no se asigna a cursos
//     (acceso global via RLS); ve todo el catalogo.
//
// summary=null para teacher/admin: CourseCard en variante
// simplificada (sin progreso porque no es propio del rol). Boton
// "Ver curso" -> /learn/[courseId] -> entry point a foros, libro
// de notas, etc.

import { redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { progressService } from "@/modules/progress/services/progress.service";
import { certificateRepository } from "@/modules/certificates/data";
import { CourseCard } from "@/modules/courses/components/course-card";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroCard } from "@/components/shared/hero-card";
import { StatTile } from "@/components/shared/stat-tile";
import type { CourseSummary } from "@/modules/progress/services/progress.service";
import type { Certificate } from "@/modules/certificates/types";
import { getDisplayName } from "@/lib/utils/format";

export default async function DashboardPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const isStudent = user.role === "student";
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

  // Stats agregados para el HeroCard student (Bloque 21.2): suma de
  // lecciones completadas / total a traves de cursos activos + %
  // global. En MVP cohorte hay 1 curso por student; el calculo
  // generaliza a multi-curso.
  const studentTotalCompleted = isStudent
    ? summaries.reduce(
        (acc, s) => acc + (s?.progress.completedCount ?? 0),
        0,
      )
    : 0;
  const studentTotalLessons = isStudent
    ? summaries.reduce((acc, s) => acc + (s?.progress.totalCount ?? 0), 0)
    : 0;
  const studentProgressPct =
    studentTotalLessons > 0
      ? Math.round((studentTotalCompleted / studentTotalLessons) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {isStudent ? (
        <HeroCard
          variant="green"
          title={`¡Bienvenido, ${getDisplayName(user)}!`}
          subtitle="Te damos la bienvenida a CNV Learning."
          rightSlot={
            courses.length > 0 ? (
              <>
                <StatTile
                  variant="chip"
                  label="Progreso"
                  value={`${studentProgressPct}%`}
                />
                <StatTile
                  variant="chip"
                  label="Lecciones"
                  value={`${studentTotalCompleted}/${studentTotalLessons}`}
                />
              </>
            ) : undefined
          }
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
      ) : (
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
      )}
    </div>
  );
}
