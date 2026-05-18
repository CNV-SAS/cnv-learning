// Dashboard del estudiante (Bloque 5 sub-bloque 5.3). Reescrito
// para mostrar progreso, insignia y "Continuar donde dejaste" en
// cada CourseCard.
//
// Por cada curso enrolled, llama progressService.getCourseSummary
// en Promise.all (queries independientes entre cursos). En MVP
// con 1 curso por estudiante esto es 1 sola llamada paralela; el
// shape preserva multi-curso para v2 sin refactor.

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
import { getDisplayName } from "@/lib/utils/format";

export default async function DashboardPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const courses = await courseRepository.listForUser(user.id);
  const summaries = await Promise.all(
    courses.map((course) =>
      progressService.getCourseSummary(user.id, course.id),
    ),
  );

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
            <CardTitle>Aún no estás inscrito en ningún curso</CardTitle>
            <CardDescription>
              No tienes cursos activos. Si crees que es un error, contacta
              a soporte en{" "}
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
