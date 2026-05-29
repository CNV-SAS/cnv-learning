// Detalle de un alumno en un curso especifico. Server Component.
//
// URL: /teacher/students/[userId]?courseId=[courseId]
// El courseId va como query param porque un mismo alumno puede
// estar en N cursos (futuro multi-curso). El page resuelve el
// curso de la URL y filtra todo a ese curso.
//
// Cadena de guards:
//   1. requireUuidParam(userId) y requireUuidParam de courseId.
//   2. canAccessTeacherPanel (rol teacher o admin).
//   3. Resuelve course + student + isTeacherOfCourse + enrollment.
//      Si cualquiera falta -> notFound (sin distinguir between
//      auth y existencia para no leak info de cursos ajenos).
//   4. canAccessTeacherStudentDetail (teacher de curso + alumno
//      enrolled, defensa contra URL manipulation per consideracion
//      C del plan B13). Admin pasa por bypass.
//
// Render:
//   - Header: back link + nombre + email + curso.
//   - Card de resumen: ProgressBar + BadgeDisplay + completed/total.
//   - Tabla de tareas: titulo + tipo + due_at + estado + accion.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { enrollmentRepository } from "@/modules/enrollments/data";
import { canAccessTeacherStudentDetail } from "@/modules/teacher-panel/policies";
import { progressService } from "@/modules/progress/services/progress.service";
import { buildProgressLabel } from "@/modules/progress/lib";
import {
  assignmentRepository,
  submissionRepository,
  gradingRepository,
} from "@/modules/assignments/data";
import { BadgeDisplay } from "@/modules/progress/components";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { requireUuidParam } from "@/lib/utils/params";
import { UUID_FORMAT } from "@/lib/utils/uuid";

interface StudentDetailPageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ courseId?: string }>;
}

const ASSIGNMENT_TYPE_LABEL: Record<string, string> = {
  file_upload: "Archivo",
  essay: "Ensayo",
  quiz_multiple_choice: "Quiz",
};

export default async function TeacherStudentDetailPage({
  params,
  searchParams,
}: StudentDetailPageProps) {
  const { userId: rawUserId } = await params;
  const userId = requireUuidParam(rawUserId);

  const { courseId: rawCourseId } = await searchParams;
  if (!rawCourseId || !UUID_FORMAT.test(rawCourseId)) {
    notFound();
  }
  const courseId = rawCourseId;

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  // Inline check teacher OR admin (refactor Bloque 14.1):
  // canAccessTeacherPanel ahora es strict teacher, pero admin
  // tambien debe poder ver detalle de un alumno (al llegar via
  // /admin/teachers/[teacherId] roster). canAccessTeacherStudentDetail
  // mas abajo valida la chain teacher-curso-alumno o el bypass admin.
  if (user.role !== "teacher" && user.role !== "admin") notFound();

  // Resolver contexto. Sin distinguir entre "no autorizado" y "no
  // existe" en la respuesta para no leak info de cursos ajenos.
  const [course, studentProfile, isTeacherOfCourse, enrollment] =
    await Promise.all([
      courseRepository.findById(courseId),
      profileRepository.findById(userId),
      user.role === "teacher"
        ? courseRepository.isTeacherOfCourse(user.id, courseId)
        : Promise.resolve(true),
      enrollmentRepository.findActiveByUserAndCourse(userId, courseId),
    ]);

  if (!course || !studentProfile) {
    notFound();
  }

  const allowed = canAccessTeacherStudentDetail(user, {
    isTeacherOfCourse,
    studentEnrolledInCourse: enrollment !== null,
  });
  if (!allowed) notFound();

  // Resolver progress + assignments + submissions + gradings en
  // paralelo para componer la tabla.
  const [summary, allAssignments] = await Promise.all([
    progressService.getCourseSummary(userId, courseId),
    assignmentRepository.listByCourse(courseId),
  ]);

  // Smoke E2E post-ISSUE-3 BUG ADICIONAL: con multi-attempt una
  // assignment puede tener N rows en submissions. Necesitamos solo
  // la mas reciente (mayor attempt_number) por (assignment, user)
  // para que el panel del docente muestre la nota del intento que
  // realmente cuenta. listLatestByAssignmentIdsForUser ya aplica el
  // pickLatestPerAssignmentUser internamente.
  const userSubmissions =
    allAssignments.length > 0
      ? await submissionRepository.listLatestByAssignmentIdsForUser(
          allAssignments.map((a) => a.id),
          userId,
        )
      : [];

  const submissionByAssignmentId = new Map(
    userSubmissions.map((s) => [s.assignment_id, s]),
  );

  const submissionIds = userSubmissions.map((s) => s.id);
  const gradings =
    submissionIds.length > 0
      ? await gradingRepository.listBySubmissionIds(submissionIds)
      : [];
  const gradingBySubmissionId = new Map(
    gradings.map((g) => [g.submission_id, g]),
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
          <Link href="/teacher">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al panel
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-black tracking-tight">
          {studentProfile.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {studentProfile.email} · {course.title}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">Resumen del curso</CardTitle>
            <BadgeDisplay badge={summary.badge} size="sm" />
          </div>
          <CardDescription>
            {/* Bloque post-23: muestra desglose lecciones + tareas
                obligatorias pendientes (decision Q2 analisis). */}
            {buildProgressLabel(summary.progress)} completadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressBar
            percentage={summary.progress.percentage}
            label={`${summary.progress.percentage}% completado`}
            showPercentage
          />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold tracking-tight">
          Tareas del curso
        </h2>
        {allAssignments.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Este curso aún no tiene tareas configuradas.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tarea</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Plazo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allAssignments.map((assignment) => {
                  const submission = submissionByAssignmentId.get(
                    assignment.id,
                  );
                  const grading = submission
                    ? gradingBySubmissionId.get(submission.id)
                    : undefined;

                  return (
                    <tr key={assignment.id}>
                      <td className="px-4 py-3 align-top">
                        {/* Smoke E2E post-ISSUE-3: la celda Tarea
                            linkea al grader del latest submission
                            para que el docente vea el historial sin
                            tener que esperar a que el alumno reenvie.
                            Si nunca entrego, queda como texto plano. */}
                        {submission ? (
                          <Link
                            href={`/teacher/grader/${submission.id}`}
                            className="text-emerald-700 hover:text-emerald-900 hover:underline"
                          >
                            {assignment.title}
                          </Link>
                        ) : (
                          assignment.title
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {ASSIGNMENT_TYPE_LABEL[assignment.type] ??
                          assignment.type}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {assignment.due_at
                          ? format(new Date(assignment.due_at), "d MMM y", {
                              locale: es,
                            })
                          : "Sin plazo"}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {grading ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-700"
                          >
                            Calificada: {grading.final_grade} /{" "}
                            {assignment.max_score}
                          </Badge>
                        ) : submission ? (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-700"
                          >
                            Entregada pendiente
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground"
                          >
                            No entregada
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        {submission && !grading ? (
                          <Button asChild size="sm">
                            <Link href={`/teacher/grader/${submission.id}`}>
                              Calificar
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
