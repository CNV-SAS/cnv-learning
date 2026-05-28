// /admin/courses (Bloque 23.1.d): listado completo de cursos del
// sistema con CTAs Nuevo curso, Editar curso, Gestionar docentes,
// Editor de contenido.
//
// Admin-only via canAccessAdmin gate (mismo patron que /admin/users).
//
// listAllAccessible respeta RLS pero como el caller es admin
// ("Admins manage courses" cubre SELECT * FROM courses), retorna
// todos los cursos del sistema. Order by title alfabetico (lo da el
// repo).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  GraduationCap,
  LayoutList,
} from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import { courseRepository } from "@/modules/courses/data";
import { CreateCourseDialog } from "@/modules/admin/components/create-course-dialog";
import { EditCourseDialog } from "@/modules/courses/components/edit-course-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAdmin(user)) notFound();

  const courses = await courseRepository.listAllAccessible();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight">
              Cursos
            </h1>
            <p className="text-sm text-muted-foreground">
              Listado completo de cursos del sistema. Crea, edita
              metadatos y gestiona docentes asignados. Para editar
              contenido (módulos, lecciones, tareas), abre el editor.
            </p>
          </div>
          <CreateCourseDialog />
        </div>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Aún no hay cursos creados. Usa el botón
            &quot;Nuevo curso&quot; para empezar.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((course) => (
                <tr key={course.id}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{course.title}</div>
                    <div className="text-xs text-muted-foreground">
                      /{course.slug}
                    </div>
                    {course.description && (
                      <div className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">
                        {course.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {course.is_published ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-700"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Publicado
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-700"
                      >
                        <EyeOff className="mr-1 h-3 w-3" />
                        Borrador
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap justify-end gap-2">
                      <EditCourseDialog course={course} />
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/courses/${course.id}/teachers`}>
                          <GraduationCap className="mr-2 h-3.5 w-3.5" />
                          Docentes
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/teacher/courses/${course.id}/edit`}>
                          <LayoutList className="mr-2 h-3.5 w-3.5" />
                          Contenido
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/learn/${course.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="sr-only">
                            Abrir vista del curso
                          </span>
                        </Link>
                      </Button>
                    </div>
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
