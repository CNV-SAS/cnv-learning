// /admin/users/[userId]/enrollments: gestion de inscripciones del
// usuario. Lista enrollments (activos e historicos) y CTA "Asignar
// curso" en el header. Cada enrollment activo tiene boton "Cancelar".

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, ShieldOff } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  const enrollments = await adminEnrollmentRepository.listForUserWithCourse(
    target.id,
  );
  const allCourses = await courseRepository.listAllAccessible();

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight">
              Inscripciones de {target.full_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Asigna o cancela cursos para este usuario. Cancelar
              preserva su progreso histórico; reactivar lo recupera.
            </p>
          </div>
          <AssignCourseDialog
            userId={target.id}
            availableCourses={availableCourses}
          />
        </div>
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Este usuario aún no está inscrito en ningún curso.
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
    </div>
  );
}
