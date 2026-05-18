// Libro de notas del estudiante (Bloque 6 sub-bloque 6.4). Server
// Component async que pide al gradesService la lista compuesta
// {assignment, submission, grading} y la renderiza como tabla
// simple. Acceso desde el course view header.

import { notFound, redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { canViewCourse } from "@/modules/courses/policies";
import { gradesService } from "@/modules/assignments/services";
import { Card, CardContent } from "@/components/ui/card";
import { requireUuidParam } from "@/lib/utils/params";

interface GradesPageProps {
  params: Promise<{ courseId: string }>;
}

function statusLabel(entry: {
  submission: unknown;
  grading: unknown;
}): string {
  if (entry.grading) return "Calificada";
  if (entry.submission) return "Entregada";
  return "Sin entregar";
}

function statusBadgeClass(entry: {
  submission: unknown;
  grading: unknown;
}): string {
  if (entry.grading) return "bg-emerald-100 text-emerald-700";
  if (entry.submission) return "bg-blue-50 text-blue-700";
  return "bg-muted text-muted-foreground";
}

export default async function GradesPage({ params }: GradesPageProps) {
  const courseId = requireUuidParam((await params).courseId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const course = await courseRepository.findById(courseId);
  if (!canViewCourse(user, { courseExists: course !== null }) || !course) {
    notFound();
  }

  const entries = await gradesService.getCourseGrades(user.id, courseId);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Libro de notas
        </p>
        <h1 className="font-display text-3xl font-black tracking-tight">
          {course.title}
        </h1>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Este curso aún no tiene tareas registradas.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Tarea</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.assignment.id}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">
                      {entry.assignment.title}
                    </div>
                    {entry.grading?.feedback && (
                      <div className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                        {entry.grading.feedback}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(entry)}`}
                    >
                      {statusLabel(entry)}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    {entry.grading ? (
                      <span className="font-semibold">
                        {entry.grading.final_grade} /{" "}
                        {entry.assignment.max_score}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
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
