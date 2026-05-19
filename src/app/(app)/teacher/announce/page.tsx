// Form para emitir anuncio scope='course'. Server Component que
// resuelve los cursos elegibles segun el rol del caller:
//   - teacher: cursos asignados via course_teachers (listForTeacher).
//   - admin: todos los cursos (listAllAccessible).
//
// Si el caller no tiene cursos elegibles, muestra EmptyState. Si
// tiene 1 solo, el AnnouncementForm preselecciona y oculta el
// select.
//
// searchParams.courseId: si se invoca desde el header del curso
// (boton "Nuevo anuncio al curso"), el courseId del curso actual
// se pasa para pre-seleccionar. Solo se aplica si el id esta en
// la lista de cursos elegibles del caller (silencioso ignore si no).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessTeacherPanel } from "@/modules/auth/policies";
import { courseRepository } from "@/modules/courses/data";
import { AnnouncementForm } from "@/modules/announcements/components/announcement-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UUID_FORMAT } from "@/lib/utils/uuid";

interface TeacherAnnouncePageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function TeacherAnnouncePage({
  searchParams,
}: TeacherAnnouncePageProps) {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessTeacherPanel(user)) notFound();

  const courses =
    user.role === "admin"
      ? await courseRepository.listAllAccessible()
      : await courseRepository.listForTeacher(user.id);

  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title }));

  const { courseId: rawCourseId } = await searchParams;
  const defaultCourseId =
    rawCourseId &&
    UUID_FORMAT.test(rawCourseId) &&
    courseOptions.some((c) => c.id === rawCourseId)
      ? rawCourseId
      : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href="/teacher">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a la bandeja
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-black tracking-tight">
          Nuevo anuncio al curso
        </h1>
        <p className="text-sm text-muted-foreground">
          Llega a los estudiantes inscritos por la página de notificaciones y
          por email.
        </p>
      </div>
      {courseOptions.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No tienes cursos asignados a tu cuenta.
        </Card>
      ) : (
        <AnnouncementForm
          scope="course"
          courses={courseOptions}
          defaultCourseId={defaultCourseId}
        />
      )}
    </div>
  );
}
