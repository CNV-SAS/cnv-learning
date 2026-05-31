// Vista de tarea para el alumno. Bloque post-23 ISSUE 3 sub-7
// refactor: ahora el render se discrimina por el AssignmentStatus
// (computeAssignmentStatus del lib) en lugar del simple "hasSubmission".
//
// Layout:
//   - Header (titulo + descripcion + dueLabel).
//   - Status card contextual segun status.kind (passed / pending /
//     failed_can_retry / failed_permanent).
//   - GradeDisplay si hay calificacion del intento mas reciente.
//   - Si canResubmit -> SubmitForm o QuizPlayer.
//   - AssignmentAttemptsCard con historial completo de intentos.

import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
} from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import {
  assignmentRepository,
  submissionRepository,
  gradingRepository,
} from "@/modules/assignments/data";
import { moduleRepository, courseRepository } from "@/modules/courses/data";
import { canViewAssignment } from "@/modules/assignments/policies";
import {
  computeAssignmentStatus,
  canResubmit,
} from "@/modules/assignments/lib/assignment-status";
import { SubmitForm } from "@/modules/assignments/components/submit-form";
import { GradeDisplay } from "@/modules/assignments/components/grade-display";
import { QuizPlayer } from "@/modules/assignments/components/quiz-player";
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

function isPast(date: Date | null): boolean {
  if (date === null) return false;
  return date.getTime() < Date.now();
}

interface AssignmentPageProps {
  params: Promise<{ courseId: string; assignmentId: string }>;
}

export default async function AssignmentPage({
  params,
}: AssignmentPageProps) {
  const raw = await params;
  const courseId = requireUuidParam(raw.courseId);
  const assignmentId = requireUuidParam(raw.assignmentId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const assignmentRow = await assignmentRepository.findById(assignmentId);
  if (
    !canViewAssignment(user, { assignmentExists: assignmentRow !== null }) ||
    !assignmentRow
  ) {
    notFound();
  }
  // Const local con type narrow para que las closures (renderStatusCard)
  // hereden el non-null en lugar de tener que re-checar.
  const assignment = assignmentRow;

  // Bloque post-23 ISSUE 3: el alumno puede tener N intentos
  // historicos. Cargamos todos + el grading de cada uno + el module +
  // course (passing_grade) en paralelo donde se puede.
  const [module, attempts] = await Promise.all([
    moduleRepository.findById(assignment.module_id),
    submissionRepository.listAttemptsByAssignmentAndUser(
      assignment.id,
      user.id,
    ),
  ]);
  if (!module) notFound();
  const course = await courseRepository.findById(module.course_id);
  if (!course) notFound();

  // Bulk fetch de gradings de todos los attempts (para el historico).
  // Solo el grading del attempt mas reciente entra al status (Q3).
  const gradingsByAttempt = await Promise.all(
    attempts.map((a) => gradingRepository.findBySubmissionId(a.id)),
  );
  const attemptRows: AttemptRow[] = attempts.map((submission, idx) => ({
    submission,
    grading: gradingsByAttempt[idx],
  }));

  // Smoke E2E round 3 BUG 1 secundario: resolver el nombre de quien
  // califico cada intento. Excluimos los auto (graded_by === user.id
  // del propio submission, caso quiz) porque para esos mostramos
  // "Calificacion automatica" sin necesidad del map.
  const graderIds = Array.from(
    new Set(
      gradingsByAttempt
        .filter((g): g is NonNullable<typeof g> => g !== null)
        .map((g) => g.graded_by)
        .filter((id): id is string => id !== null && id !== user.id),
    ),
  );
  const graderProfiles =
    graderIds.length > 0 ? await profileRepository.findByIds(graderIds) : [];
  const gradersById = new Map(
    graderProfiles.map((p) => [p.id, p.full_name]),
  );

  const latestAttemptIdx =
    attempts.length === 0
      ? -1
      : attempts.reduce(
          (maxIdx, s, idx) =>
            s.attempt_number > attempts[maxIdx].attempt_number ? idx : maxIdx,
          0,
        );
  const latestAttempt =
    latestAttemptIdx === -1 ? null : attempts[latestAttemptIdx];
  const latestGrading =
    latestAttemptIdx === -1 ? null : (gradingsByAttempt[latestAttemptIdx] ?? null);
  const submittedAttempts = attempts.filter(
    (s) => s.status === "submitted" || s.status === "graded",
  ).length;

  const passingGradePercent = Number(course.passing_grade);
  const status = computeAssignmentStatus({
    maxAttempts: assignment.max_attempts,
    passingGradePercent,
    assignmentMaxScore: Number(assignment.max_score),
    submittedAttempts,
    latestFinalGrade:
      latestGrading !== null ? Number(latestGrading.final_grade) : null,
  });

  const dueAt = assignment.due_at ? new Date(assignment.due_at) : null;
  const isOverdue = isPast(dueAt);
  const dueLabel =
    dueAt === null
      ? "Sin plazo"
      : isOverdue
        ? "Vencido"
        : `Vence el ${format(dueAt, "d 'de' MMMM, yyyy", { locale: es })}`;

  const isStudent = user.role === "student";
  const showSubmitOrPlayer =
    isStudent && !isOverdue && canResubmit(status);

  // Status card: copy contextual por kind. not_attempted no muestra
  // status card (el form ya cubre el caso).
  function renderStatusCard() {
    if (status.kind === "passed") {
      return (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              Tarea aprobada
            </CardTitle>
            <CardDescription className="text-emerald-900/80">
              Nota: {status.finalGrade} / {assignment.max_score}. Mínimo
              requerido: {status.threshold} ({passingGradePercent}%).
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
    if (status.kind === "pending_grade") {
      return (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-900">
              <Clock className="h-5 w-5 text-amber-700" />
              Pendiente de calificación
            </CardTitle>
            <CardDescription className="text-amber-900/80">
              Tu entrega anterior está esperando el feedback del docente.
              No puedes reenviar hasta recibirlo.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
    if (status.kind === "failed_permanent") {
      return (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-rose-900">
              <Lock className="h-5 w-5 text-rose-700" />
              Tarea reprobada
            </CardTitle>
            <CardDescription className="text-rose-900/80">
              Has agotado los {status.attemptsUsed} intento
              {status.attemptsUsed === 1 ? "" : "s"} disponibles sin
              aprobar. La tarea queda como reprobada definitivamente y
              bloquea el progreso del módulo. Contacta al docente si
              necesitas más oportunidades.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
    if (status.kind === "failed_can_retry") {
      const remainingText =
        status.attemptsRemaining === null
          ? "Tienes intentos ilimitados."
          : `Te ${status.attemptsRemaining === 1 ? "queda" : "quedan"} ${status.attemptsRemaining} intento${status.attemptsRemaining === 1 ? "" : "s"}.`;
      return (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              Tarea no aprobada
            </CardTitle>
            <CardDescription className="text-amber-900/80">
              Tu última nota ({status.finalGrade} / {assignment.max_score})
              no alcanza la mínima requerida ({status.threshold},{" "}
              {passingGradePercent}%). {remainingText} Reenvíala para
              intentarlo de nuevo.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
    return null;
  }

  // Reference para evitar unused var warning si latestAttempt no se
  // usa (se accede para el index del grading, que ya esta resuelto).
  void latestAttempt;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-black tracking-tight">
            {assignment.title}
          </h1>
          <span className="shrink-0 text-xs text-muted-foreground">
            {dueLabel}
          </span>
        </div>
        {assignment.description && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {assignment.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Puntaje máximo: {assignment.max_score}
        </p>
      </div>

      {renderStatusCard()}

      {latestGrading !== null && (
        <GradeDisplay grading={latestGrading} assignment={assignment} />
      )}

      {showSubmitOrPlayer && assignment.type === "quiz_multiple_choice" && (
        <QuizPlayer
          courseId={courseId}
          assignmentId={assignment.id}
          attemptsRemaining={
            status.kind === "failed_can_retry"
              ? status.attemptsRemaining
              : assignment.max_attempts === 0
                ? null
                : assignment.max_attempts - submittedAttempts
          }
        />
      )}

      {showSubmitOrPlayer &&
        (assignment.type === "file_upload" ||
          assignment.type === "essay") && (
          <SubmitForm
            assignmentId={assignment.id}
            type={assignment.type}
            mode={status.kind === "failed_can_retry" ? "retry" : "first"}
            attemptsRemaining={
              status.kind === "failed_can_retry"
                ? status.attemptsRemaining
                : assignment.max_attempts === 0
                  ? null
                  : assignment.max_attempts - submittedAttempts
            }
            currentAttemptNumber={submittedAttempts + 1}
          />
        )}

      {isStudent && isOverdue && status.kind === "not_attempted" && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            El plazo de entrega venció. Contacta al docente si necesitas
            una prórroga.
          </CardContent>
        </Card>
      )}

      {!isStudent && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Vista previa. Solo los estudiantes pueden entregar esta tarea.
          </CardContent>
        </Card>
      )}

      {isStudent && (
        <AssignmentAttemptsCard
          attempts={attemptRows}
          assignmentMaxScore={Number(assignment.max_score)}
          coursePassingGradePercent={passingGradePercent}
          maxAttempts={assignment.max_attempts}
          gradersById={gradersById}
        />
      )}
    </div>
  );
}
