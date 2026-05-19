// Dashboard accesible para los 3 roles. Decision del cierre del
// Bloque 9: branch por rol para listar cursos accesibles.
//
//   - Student: listForUser (filtra por enrollment activo) +
//     progressService para progreso propio + CourseCard con
//     summary completo (ProgressBar, BadgeDisplay, continueLesson).
//
//   - Teacher / admin: listAllAccessible (RLS filtra: teachers ven
//     asignados, admins ven todo) + summary=null + CourseCard en
//     variante simplificada (sin progreso porque no es propio del
//     rol). Boton "Ver curso" -> /learn/[courseId] -> entry point
//     a foros, libro de notas, etc.
//
// Una sola fuente de verdad para "tus cursos"; el sidebar global
// no necesita un item "Foros" ni un "Mis cursos" por rol.

import { redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { progressService } from "@/modules/progress/services/progress.service";
import { CourseCard } from "@/modules/courses/components/course-card";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CourseSummary } from "@/modules/progress/services/progress.service";
import { getDisplayName } from "@/lib/utils/format";

export default async function DashboardPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const isStudent = user.role === "student";
  const courses = isStudent
    ? await courseRepository.listForUser(user.id)
    : await courseRepository.listAllAccessible();

  const summaries: Array<CourseSummary | null> = isStudent
    ? await Promise.all(
        courses.map((course) =>
          progressService.getCourseSummary(user.id, course.id),
        ),
      )
    : courses.map(() => null);

  const emptyTitle = isStudent
    ? "Aún no estás inscrito en ningún curso"
    : user.role === "teacher"
      ? "Aún no tienes cursos asignados"
      : "Aún no hay cursos en el sistema";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight">
          Hola, {getDisplayName(user)}
        </h1>
        <p className="text-sm text-muted-foreground">
          Te damos la bienvenida a CNV Learning.
        </p>
      </div>

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
