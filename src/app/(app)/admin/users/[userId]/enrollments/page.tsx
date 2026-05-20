// /admin/users/[userId]/enrollments: gestion de cursos asignados al
// usuario. Discrimina por target.role (fix BUG 2 del smoke 14):
//   - student -> enrollments table (soft delete via is_active).
//   - teacher -> course_teachers table (hard delete, PK compuesto).
//   - admin   -> info card (acceso global via RLS, no requiere
//                asignacion explicita).
//
// El URL /enrollments se conserva por consistencia con la navegacion
// del Bloque 14.6, aunque para teacher la entidad real sea
// course_teachers. El title de la pagina cambia segun el rol.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  GraduationCap,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import {
  adminEnrollmentRepository,
  adminUserRepository,
} from "@/modules/admin/data";
import { courseRepository } from "@/modules/courses/data";
import { AssignCourseDialog } from "@/modules/admin/components/assign-course-dialog";
import { CancelEnrollmentButton } from "@/modules/admin/components/cancel-enrollment-button";
import { AssignCourseToTeacherDialog } from "@/modules/admin/components/assign-course-to-teacher-dialog";
import { RemoveTeacherFromCourseButton } from "@/modules/admin/components/remove-teacher-from-course-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Profile } from "@/modules/auth/types";
import type { Course } from "@/modules/courses/types";

export default async function AdminUserEnrollmentsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const actor = await profileRepository.getCurrentUser();
  if (!actor) redirect("/login");
  if (!canAccessAdmin(actor)) notFound();

  const target = await adminUserRepository.findProfileById(userId);
  if (!target) notFound();

  const allCourses = await courseRepository.listAllAccessible();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href={`/admin/users/${target.id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al detalle
          </Link>
        </Button>
      </div>

      {target.role === "student" ? (
        <StudentEnrollmentsSection target={target} allCourses={allCourses} />
      ) : target.role === "teacher" ? (
        <TeacherAssignmentsSection target={target} allCourses={allCourses} />
      ) : (
        <AdminAccessSection target={target} />
      )}
    </div>
  );
}

async function StudentEnrollmentsSection({
  target,
  allCourses,
}: {
  target: Profile;
  allCourses: Course[];
}) {
  const enrollments = await adminEnrollmentRepository.listForUserWithCourse(
    target.id,
  );

  // Cursos disponibles para asignar = cursos sin enrollment activo
  // existente. Los cursos con enrollment cancelado se incluyen para
  // que el admin pueda reactivar (el service maneja la reactivacion).
  const activeCourseIds = new Set(
    enrollments
      .filter((e) => e.enrollment.is_active)
      .map((e) => e.course.id),
  );
  const availableCourses = allCourses
    .filter((c) => !activeCourseIds.has(c.id))
    .map((c) => ({ id: c.id, title: c.title }));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">
            Inscripciones de {target.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Asigna o cancela cursos para este estudiante. Cancelar
            preserva su progreso histórico; reactivar lo recupera.
          </p>
        </div>
        <AssignCourseDialog
          userId={target.id}
          availableCourses={availableCourses}
        />
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Este estudiante aún no está inscrito en ningún curso.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Inscrito</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrollments.map(({ enrollment, course }) => (
                <tr key={enrollment.id}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{course.title}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    {format(new Date(enrollment.enrolled_at), "d MMM y", {
                      locale: es,
                    })}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {enrollment.is_active ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-700"
                      >
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Activa
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-muted text-muted-foreground"
                      >
                        <ShieldOff className="mr-1 h-3 w-3" />
                        Cancelada
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    {enrollment.is_active ? (
                      <CancelEnrollmentButton
                        enrollmentId={enrollment.id}
                        userId={target.id}
                        courseTitle={course.title}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sin acciones
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

async function TeacherAssignmentsSection({
  target,
  allCourses,
}: {
  target: Profile;
  allCourses: Course[];
}) {
  const assignments =
    await adminEnrollmentRepository.listCoursesAssignedToTeacher(target.id);

  // Cursos disponibles para asignar = cursos donde el docente no
  // esta ya asignado. course_teachers no tiene soft delete, asi que
  // la unica restriccion es no duplicar la asignacion existente.
  const assignedCourseIds = new Set(assignments.map((a) => a.courseId));
  const availableCourses = allCourses
    .filter((c) => !assignedCourseIds.has(c.id))
    .map((c) => ({ id: c.id, title: c.title }));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">
            Cursos asignados a {target.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Asigna o remueve cursos donde este docente puede impartir.
            La asignación habilita el panel docente, la calificación de
            entregas y la emisión de anuncios del curso.
          </p>
        </div>
        <AssignCourseToTeacherDialog
          teacherUserId={target.id}
          availableCourses={availableCourses}
        />
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Este docente aún no tiene cursos asignados.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Asignado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignments.map((a) => (
                <tr key={`${a.courseId}-${a.teacherId}`}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{a.course.title}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    {format(new Date(a.assignedAt), "d MMM y", {
                      locale: es,
                    })}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <RemoveTeacherFromCourseButton
                      teacherUserId={a.teacherId}
                      courseId={a.courseId}
                      courseTitle={a.course.title}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AdminAccessSection({ target }: { target: Profile }) {
  return (
    <>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight">
          Acceso de {target.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Los administradores tienen acceso global vía políticas RLS.
        </p>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="space-y-3 py-6">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-700" />
            <h2 className="text-base font-semibold text-foreground">
              Acceso global vía RLS
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Los administradores no se inscriben en cursos ni se asignan
            como docentes. Las policies RLS les dan visibilidad completa
            sobre cursos, lecciones, entregas, calificaciones y foros.
            Si necesitas que este usuario opere como docente o estudiante
            de un curso específico, cambia primero su rol en el detalle.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge
              variant="secondary"
              className="bg-emerald-100 text-emerald-700"
            >
              <GraduationCap className="mr-1 h-3 w-3" />
              Sin asignación de cursos requerida
            </Badge>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
