// Bandeja del docente (Bloque 6 sub-bloque 6.5, movida a sub-ruta
// en Bloque 13.1 cuando /teacher pasa a ser overview del panel).
//
// Lista de submissions con status='submitted' sin grading aun. RLS
// filtra a los cursos del teacher autenticado. FIFO (submitted_at
// ASC, mas vieja primero).

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessTeacherInbox } from "@/modules/auth/policies";
import { teacherInboxService } from "@/modules/assignments/services/teacher-inbox.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function TeacherInboxPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessTeacherInbox(user)) redirect("/unauthorized");

  const entries = await teacherInboxService.getPendingSubmissions();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href="/teacher">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al panel
          </Link>
        </Button>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Por calificar
        </p>
        <h1 className="font-display text-3xl font-black tracking-tight">
          Bandeja de entregas
        </h1>
        <p className="text-sm text-muted-foreground">
          Entregas pendientes de calificación, ordenadas por fecha de
          envío (más antiguas primero).
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No hay entregas pendientes en este momento.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Tarea</th>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Entregada</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map(({ submission, assignment, student, courseTitle }) => (
                <tr key={submission.id}>
                  <td className="px-4 py-3 align-top">
                    {student?.full_name ?? "(estudiante)"}
                  </td>
                  <td className="px-4 py-3 align-top">{assignment.title}</td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    {courseTitle}
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    {submission.submitted_at
                      ? format(
                          new Date(submission.submitted_at),
                          "d MMM yyyy, h:mm a",
                          { locale: es },
                        )
                      : "—"}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <Button asChild size="sm">
                      <Link href={`/teacher/grader/${submission.id}`}>
                        Calificar
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
