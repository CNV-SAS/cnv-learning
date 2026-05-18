// Vista de tarea (Bloque 6 sub-bloque 6.4). Server Component
// async que orquesta:
//   - Resolve params + uuid validation.
//   - Fetch user + assignment + own submission + grading en
//     paralelo donde aplica.
//   - Policy canViewAssignment + RLS fallback notFound().
//   - Renderiza header + description + status + SubmitForm
//     (condicional) + GradeDisplay (condicional).

import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import {
  assignmentRepository,
  submissionRepository,
  gradingRepository,
} from "@/modules/assignments/data";
import { canViewAssignment } from "@/modules/assignments/policies";
import {
  SubmitForm,
  GradeDisplay,
} from "@/modules/assignments/components";
import { Card, CardContent } from "@/components/ui/card";
import { requireUuidParam } from "@/lib/utils/params";

// Helper fuera del componente: la regla react-hooks/purity flagea
// llamadas a Date.now() / new Date() dentro de componentes porque
// son funciones impuras. Server Components async son una excepcion
// de facto (corren una vez por request), pero la regla no lo sabe.
// Mover la decision aqui mantiene el componente "puro" a ojos del
// linter.
function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

interface AssignmentPageProps {
  params: Promise<{ courseId: string; assignmentId: string }>;
}

export default async function AssignmentPage({
  params,
}: AssignmentPageProps) {
  const raw = await params;
  // courseId valida formato pero no se usa downstream (la assignment
  // referencia su course via module). Lo validamos igual para 404
  // limpio en URL malformada.
  requireUuidParam(raw.courseId);
  const assignmentId = requireUuidParam(raw.assignmentId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const assignment = await assignmentRepository.findById(assignmentId);
  if (
    !canViewAssignment(user, { assignmentExists: assignment !== null }) ||
    !assignment
  ) {
    notFound();
  }

  const submission = await submissionRepository.findByAssignmentAndUser(
    assignment.id,
    user.id,
  );
  const grading = submission
    ? await gradingRepository.findBySubmissionId(submission.id)
    : null;

  const dueAt = assignment.due_at ? new Date(assignment.due_at) : null;
  const isOverdue = dueAt !== null && isPast(dueAt);
  const dueLabel =
    dueAt === null
      ? "Sin plazo"
      : isOverdue
        ? "Vencido"
        : `Vence el ${format(dueAt, "d 'de' MMMM, yyyy", { locale: es })}`;

  const hasSubmission = submission !== null;
  const hasGrading = grading !== null;
  const canSubmit =
    !hasSubmission &&
    !hasGrading &&
    !isOverdue &&
    user.role === "student" &&
    (assignment.type === "file_upload" || assignment.type === "essay");

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

      {hasGrading && grading ? (
        <GradeDisplay grading={grading} assignment={assignment} />
      ) : hasSubmission ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Ya entregaste esta tarea. Estamos esperando la calificación
            del docente.
          </CardContent>
        </Card>
      ) : canSubmit ? (
        <SubmitForm
          assignmentId={assignment.id}
          type={assignment.type as "file_upload" | "essay"}
        />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            {isOverdue
              ? "El plazo de entrega venció. Contacta al docente si necesitas una prórroga."
              : "Esta tarea no acepta entregas desde la plataforma."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
