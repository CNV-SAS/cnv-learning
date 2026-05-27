// /admin/courses/[id]/teachers (Bloque 23.1.e): gestion de docentes
// asignados al curso. Header con back + titulo + boton "Asignar
// docente". Tabla con teachers asignados + toggle del flag
// can_manage_course + boton "Remover".
//
// Admin-only via canAccessAdmin gate.
//
// La asignacion inicial NO incluye el flag (siempre false por
// default); el admin lo habilita despues con el toggle en la row.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import { courseRepository } from "@/modules/courses/data";
import { adminEnrollmentRepository } from "@/modules/admin/data";
import { AddTeacherToCourseDialog } from "@/modules/admin/components/add-teacher-to-course-dialog";
import { TeacherCanManageCourseToggle } from "@/modules/admin/components/teacher-can-manage-course-toggle";
import { RemoveTeacherFromCourseButton } from "@/modules/admin/components/remove-teacher-from-course-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCourseTeachersPage({ params }: PageProps) {
  const { id: courseId } = await params;

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAdmin(user)) notFound();

  const course = await courseRepository.findById(courseId);
  if (!course) notFound();

  const [assigned, available] = await Promise.all([
    adminEnrollmentRepository.listTeachersAssignedToCourse(courseId),
    adminEnrollmentRepository.listTeachersNotAssignedToCourse(courseId),
  ]);

  const availableTeachers = available.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href="/admin/courses">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a cursos
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight">
              Docentes del curso
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {course.title}
              </span>{" "}
              · /{course.slug}
            </p>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Los docentes asignados pueden editar contenido del curso
              (módulos, lecciones, tareas, recursos). El flag{" "}
              <em>Puede gestionar curso completo</em> les habilita
              además editar los metadatos del curso (título, slug,
              descripción, publicar).
            </p>
          </div>
          <AddTeacherToCourseDialog
            courseId={courseId}
            availableTeachers={availableTeachers}
          />
        </div>
      </div>

      {assigned.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Este curso aún no tiene docentes asignados. Usa el botón
            &quot;Asignar docente&quot; para agregar uno.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Docente</th>
                <th className="px-4 py-3">Permisos</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assigned.map((row) => (
                <tr key={row.teacherId}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{row.profile.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.profile.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <TeacherCanManageCourseToggle
                      teacherUserId={row.teacherId}
                      courseId={courseId}
                      initialValue={row.canManageCourse}
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <RemoveTeacherFromCourseButton
                      teacherUserId={row.teacherId}
                      courseId={courseId}
                      courseTitle={course.title}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
