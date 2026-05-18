// Dashboard del estudiante (Bloque 4 sub-bloque 4.3). Lista los
// cursos enrolled del user via courseRepository.listForUser (RLS
// hace el filtrado real). Grid responsive 1/2 columnas; preparado
// para multi-curso en v2 sin refactor pese a que el MVP tiene 1
// solo curso por estudiante.
//
// La insignia visible y "Continuar donde dejaste" entran en Bloque 5
// (dependen del calculo de progreso). En Bloque 4 el dashboard
// muestra solo cursos y vincula a /learn/[courseId].

import { redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
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
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
