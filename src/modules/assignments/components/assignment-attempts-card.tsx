// AssignmentAttemptsCard (Bloque post-23 ISSUE 3 sub-7): muestra el
// historial de intentos del alumno para una tarea + estado actual
// (intento N de Y, nota minima del curso, status del ultimo intento).
//
// Reutilizable por:
//   - Student assignment detail (/learn/[courseId]/assignment/[id]):
//     ve su propio histórico.
//   - Teacher grader (/teacher/grader/[submissionId]): ve los intentos
//     previos del alumno calificando.
//
// Cada intento muestra: numero, fecha de submitted_at, nota (si tiene
// grading) o "Pendiente" si no, badge de status (aprobado/reprobado/
// pendiente) calculado contra el threshold del curso.

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  passes,
  passingThreshold,
} from "@/modules/assignments/lib/assignment-status";
import type { Submission, Grading } from "@/modules/assignments/types";

export interface AttemptRow {
  submission: Submission;
  grading: Grading | null;
}

interface AssignmentAttemptsCardProps {
  attempts: AttemptRow[];
  assignmentMaxScore: number;
  coursePassingGradePercent: number;
  maxAttempts: number;
}

function formatAttemptDate(iso: string | null): string {
  if (!iso) return "Sin fecha";
  return format(new Date(iso), "d 'de' MMMM 'de' yyyy, HH:mm", {
    locale: es,
  });
}

function AttemptItem({
  row,
  threshold,
}: {
  row: AttemptRow;
  threshold: number;
}) {
  const { submission, grading } = row;
  let badge: React.ReactNode;
  let noteText: string;
  if (grading === null) {
    badge = (
      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
        <Clock className="mr-1 h-3 w-3" />
        Pendiente
      </Badge>
    );
    noteText = "Pendiente de calificación.";
  } else {
    const ok = passes(Number(grading.final_grade), threshold);
    badge = ok ? (
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Aprobado
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-rose-100 text-rose-700">
        <XCircle className="mr-1 h-3 w-3" />
        Reprobado
      </Badge>
    );
    noteText = `Nota: ${Number(grading.final_grade)}`;
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-border bg-card/40 p-3 text-sm">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            Intento {submission.attempt_number}
          </span>
          {badge}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatAttemptDate(submission.submitted_at)}
        </p>
        <p className="text-xs text-foreground/80">{noteText}</p>
      </div>
    </li>
  );
}

export function AssignmentAttemptsCard({
  attempts,
  assignmentMaxScore,
  coursePassingGradePercent,
  maxAttempts,
}: AssignmentAttemptsCardProps) {
  const threshold = passingThreshold(
    assignmentMaxScore,
    coursePassingGradePercent,
  );
  const thresholdLabel = `${threshold}/${assignmentMaxScore} (${coursePassingGradePercent}%)`;
  const attemptsLabel =
    maxAttempts === 0
      ? "Intentos ilimitados"
      : `Intento ${attempts.length} de ${maxAttempts}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Intentos</CardTitle>
        <CardDescription>
          {attemptsLabel}. Nota mínima requerida: {thresholdLabel}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no has entregado esta tarea.
          </p>
        ) : (
          <ul className="space-y-2">
            {attempts
              .slice()
              .sort(
                (a, b) =>
                  a.submission.attempt_number - b.submission.attempt_number,
              )
              .map((row) => (
                <AttemptItem
                  key={row.submission.id}
                  row={row}
                  threshold={threshold}
                />
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
