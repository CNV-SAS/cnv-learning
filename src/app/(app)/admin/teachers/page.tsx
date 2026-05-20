// /admin/teachers: lista de docentes del sistema con resumen.
// Refactor del Bloque 14.1: el admin pierde acceso a /teacher
// (panel del docente estricto) y entra aqui para inspeccionar
// el panel de un docente especifico.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import { courseRepository } from "@/modules/courses/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminTeachersPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAdmin(user)) notFound();

  const teachers = await profileRepository.listTeachers();

  // Por cada teacher, contar cursos que imparte. listForTeacher
  // retorna courses asignados via course_teachers; admin client
  // detras (admin pasa por RLS de course_teachers). Para N teachers
  // = N queries; con MVP de 1-3 teachers es despreciable.
  const teachersWithCourses = await Promise.all(
    teachers.map(async (teacher) => {
      const courses = await courseRepository.listForTeacher(teacher.id);
      return { teacher, coursesCount: courses.length };
    }),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href="/admin">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al panel
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-black tracking-tight">
          Docentes
        </h1>
        <p className="text-sm text-muted-foreground">
          Listado de docentes del sistema. Abre el panel de cada uno
          para ver sus cursos, estudiantes y entregas pendientes.
        </p>
      </div>

      {teachersWithCourses.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Aún no hay docentes registrados en el sistema.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Docente</th>
                <th className="px-4 py-3">Cursos</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teachersWithCourses.map(({ teacher, coursesCount }) => (
                <tr key={teacher.id}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{teacher.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {teacher.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    {coursesCount === 1
                      ? "1 curso"
                      : `${coursesCount} cursos`}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/teachers/${teacher.id}`}>
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Ver panel
                      </Link>
                    </Button>
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
