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
import { Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { progressService } from "@/modules/progress/services/progress.service";
import { certificateRepository } from "@/modules/certificates/data";
import { BadgeDisplay } from "@/modules/progress/components";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const [studentSummaries, studentCertificates] = await Promise.all([
    isStudent
      ? Promise.all(
          courses.map((c) =>
            progressService.getCourseSummary(user.id, c.id),
          ),
        )
      : Promise.resolve([]),
    isStudent
      ? certificateRepository.listForUser(user.id)
      : Promise.resolve([]),
  ]);
  const certByCourseId = new Map(
    studentCertificates.map((c) => [c.course_id, c]),
  );

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
              const certificate = certByCourseId.get(course.id);
              const isRevoked = certificate?.status === "revoked";
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
                  <CardContent className="space-y-3 pt-0">
                    <ProgressBar
                      percentage={summary.progress.percentage}
                      label={`${summary.progress.completedCount} de ${summary.progress.totalCount} lecciones`}
                      showPercentage
                    />
                    {certificate && (
                      <div className="space-y-1 border-t border-border pt-3">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <a
                            href={`/api/certificates/${certificate.id}/pdf`}
                          >
                            <Download className="mr-2 h-3.5 w-3.5" />
                            Descargar certificado
                          </a>
                        </Button>
                        <p
                          className={`text-xs ${isRevoked ? "text-rose-700" : "text-muted-foreground"}`}
                        >
                          {isRevoked && certificate.revoked_at
                            ? `Revocado el ${format(new Date(certificate.revoked_at), "d MMM y", { locale: es })}`
                            : `Emitido el ${format(new Date(certificate.issued_at), "d MMM y", { locale: es })}`}
                        </p>
                      </div>
                    )}
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
