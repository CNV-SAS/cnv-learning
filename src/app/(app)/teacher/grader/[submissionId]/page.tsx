// Vista del grader: detalle de una submission + form para publicar
// calificacion. Si ya hay grading existente, muestra read-only (sin
// form en MVP; re-grade polish post-MVP).
//
// signedUrl del archivo (cuando file_upload) generado con TTL 60 min
// para que la sesion de calificacion no se quede sin acceso si el
// docente se distrae unos minutos.
//
// Bloque post-23 ISSUE 3 sub-7: incluye AssignmentAttemptsCard con
// los intentos previos del alumno + un aviso si el submission abierto
// NO es el ultimo intento (solo el mas reciente se puede calificar,
// decision Q3).

import { notFound, redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessTeacherInbox } from "@/modules/auth/policies";
import {
  submissionRepository,
  gradingRepository,
  assignmentRepository,
  submissionStorageRepository,
  aiGradingSuggestionRepository,
} from "@/modules/assignments/data";
import { moduleRepository, courseRepository } from "@/modules/courses/data";
import { canGradeAssignment } from "@/modules/assignments/policies";
import { GradeDisplay } from "@/modules/assignments/components/grade-display";
import { GraderSection } from "@/modules/assignments/components/grader-section";
import { SubmissionPreview } from "@/modules/assignments/components/submission-preview";
import {
  AssignmentAttemptsCard,
  type AttemptRow,
} from "@/modules/assignments/components/assignment-attempts-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUuidParam } from "@/lib/utils/params";

const GRADER_SIGNED_URL_TTL_SECONDS = 60 * 60;

interface GraderPageProps {
  params: Promise<{ submissionId: string }>;
}

export default async function GraderPage({ params }: GraderPageProps) {
  const submissionId = requireUuidParam((await params).submissionId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessTeacherInbox(user)) redirect("/unauthorized");

  const submission = await submissionRepository.findById(submissionId);
  if (
    !canGradeAssignment(user, { submissionExists: submission !== null }) ||
    !submission
  ) {
    notFound();
  }

  const assignment = await assignmentRepository.findById(
    submission.assignment_id,
  );
  if (!assignment) notFound();

  // Bloque post-23 ISSUE 3: cargamos course (para passing_grade) +
  // todos los attempts del alumno para esta tarea (con sus gradings)
  // para mostrar el historial al docente.
  const moduleRow = await moduleRepository.findById(assignment.module_id);
  if (!moduleRow) notFound();
  const course = await courseRepository.findById(moduleRow.course_id);
  if (!course) notFound();

  const [grading, student, signedUrl, latestSuggestion, attempts] =
    await Promise.all([
      gradingRepository.findBySubmissionId(submission.id),
      profileRepository.findById(submission.user_id),
      submission.storage_path
        ? submissionStorageRepository.getSignedUrl(
            submission.storage_path,
            GRADER_SIGNED_URL_TTL_SECONDS,
          )
        : Promise.resolve(null),
      aiGradingSuggestionRepository.findLatestBySubmissionId(submission.id),
      submissionRepository.listAttemptsByAssignmentAndUser(
        submission.assignment_id,
        submission.user_id,
      ),
    ]);

  // Sub-7: el grader solo puede calificar el ultimo intento (Q3).
  // Calculamos el latestAttempt para mostrar aviso si el docente
  // abre un intento antiguo desde un deep-link.
  const latestAttempt = attempts.reduce(
    (max, s) => (s.attempt_number > max.attempt_number ? s : max),
    attempts[0] ?? submission,
  );
  const isLatestAttempt = latestAttempt.id === submission.id;

  // Bulk fetch de gradings de los demas attempts (el del actual ya lo
  // tenemos en `grading`). Optimizable, pero el volumen es pequenio
  // (max attempts por tarea suele ser <5).
  const otherAttempts = attempts.filter((a) => a.id !== submission.id);
  const otherGradings = await Promise.all(
    otherAttempts.map((a) => gradingRepository.findBySubmissionId(a.id)),
  );
  const attemptRows: AttemptRow[] = [
    { submission, grading },
    ...otherAttempts.map((a, idx) => ({
      submission: a,
      grading: otherGradings[idx],
    })),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Calificación
        </p>
        <h1 className="font-display text-3xl font-black tracking-tight">
          {assignment.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Estudiante: {student?.full_name ?? "(desconocido)"}
        </p>
        <p className="text-xs text-muted-foreground">
          Puntaje máximo: {assignment.max_score}. Nota mínima para
          aprobar: {Number(course.passing_grade)}% (
          {(
            (Number(assignment.max_score) * Number(course.passing_grade)) /
            100
          ).toFixed(2)}
          /{assignment.max_score}).
        </p>
      </div>

      {!isLatestAttempt && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base text-amber-900">
              Estás viendo un intento anterior
            </CardTitle>
            <CardDescription className="text-amber-900/80">
              Este es el intento {submission.attempt_number}. El alumno
              ya entregó el intento {latestAttempt.attempt_number}. Solo
              el intento más reciente se puede calificar.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <SubmissionPreview
        submission={submission}
        assignment={assignment}
        signedUrl={signedUrl}
      />

      {grading ? (
        <GradeDisplay grading={grading} assignment={assignment} />
      ) : isLatestAttempt ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Publicar calificación</CardTitle>
          </CardHeader>
          <CardContent>
            <GraderSection
              submissionId={submission.id}
              assignmentType={assignment.type}
              maxScore={assignment.max_score}
              initialSuggestion={latestSuggestion}
            />
          </CardContent>
        </Card>
      ) : null}

      <AssignmentAttemptsCard
        attempts={attemptRows}
        assignmentMaxScore={Number(assignment.max_score)}
        coursePassingGradePercent={Number(course.passing_grade)}
        maxAttempts={assignment.max_attempts}
      />
    </div>
  );
}
