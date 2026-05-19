// Pagina de perfil del usuario autenticado. Server Component que
// muestra info basica + lista de cursos accesibles segun rol.
//
// MVP §Bloque 11: visualizacion de badges en perfil. Para student
// cada curso enrolled lleva su BadgeDisplay calculado al render
// desde lesson_progress (no persistido). Para teacher y admin la
// lista es simple (no aplica badge: no tienen progreso propio).
//
// Edicion de profile (nombre, avatar, bio, password): Bloque 16.
// Aqui solo display; el aviso muted lo señala.
//
// No usa requireUuidParam (la ruta es /profile sin params; el user
// se resuelve de la sesion).

import Link from "next/link";
import { redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { progressService } from "@/modules/progress/services/progress.service";
import { BadgeDisplay } from "@/modules/progress/components";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/progress-bar";
import { getDisplayName, getInitials } from "@/lib/utils/format";

const ROLE_LABEL: Record<"student" | "teacher" | "admin", string> = {
  student: "Estudiante",
  teacher: "Docente",
  admin: "Administrador",
};

export default async function ProfilePage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const displayName = getDisplayName(user);
  const initials = getInitials(user.full_name, user.email);
  const roleLabel = ROLE_LABEL[user.role];

  const isStudent = user.role === "student";

  const courses = isStudent
    ? await courseRepository.listForUser(user.id)
    : user.role === "teacher"
      ? await courseRepository.listForTeacher(user.id)
      : await courseRepository.listAllAccessible();

  const studentSummaries = isStudent
    ? await Promise.all(
        courses.map((c) => progressService.getCourseSummary(user.id, c.id)),
      )
    : [];

  const coursesSectionTitle = isStudent
    ? "Mis cursos"
    : user.role === "teacher"
      ? "Cursos que imparto"
      : "Cursos en el sistema";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight">
          Perfil
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumen de tu cuenta en CNV Learning.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
              {initials}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{displayName}</CardTitle>
                <Badge variant="secondary">{roleLabel}</Badge>
              </div>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            La edición del perfil estará disponible próximamente.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold tracking-tight">
          {coursesSectionTitle}
        </h2>
        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              {isStudent
                ? "Aún no estás inscrito en ningún curso."
                : user.role === "teacher"
                  ? "Aún no tienes cursos asignados."
                  : "Aún no hay cursos en el sistema."}
            </CardContent>
          </Card>
        ) : isStudent ? (
          <div className="grid gap-3 md:grid-cols-2">
            {courses.map((course, idx) => {
              const summary = studentSummaries[idx];
              return (
                <Card key={course.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        <Link
                          href={`/learn/${course.id}`}
                          className="hover:underline"
                        >
                          {course.title}
                        </Link>
                      </CardTitle>
                      <BadgeDisplay badge={summary.badge} size="sm" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ProgressBar
                      percentage={summary.progress.percentage}
                      label={`${summary.progress.completedCount} de ${summary.progress.totalCount} lecciones`}
                      showPercentage
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {courses.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <Link
                      href={`/learn/${course.id}`}
                      className="hover:underline"
                    >
                      {course.title}
                    </Link>
                  </CardTitle>
                  {course.description && (
                    <CardDescription className="line-clamp-2">
                      {course.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
