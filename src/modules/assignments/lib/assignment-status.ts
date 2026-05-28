// Lib puro de calculo del estado de una tarea para un alumno
// (Bloque post-23 ISSUE 3). Centraliza la logica de:
//
//   - Calcular el threshold de aprobacion: (passing_grade / 100) *
//     assignment.max_score.
//   - Decidir si la nota final aprueba el threshold.
//   - Computar el estado de la tarea para mostrar en UI y para que
//     el progressService decida si la tarea cuenta para el progreso.
//
// Discriminated union AssignmentStatus permite a la UI mostrar copy
// y CTAs distintos por kind:
//   - not_attempted: alumno aun no entregó. CTA "Entregar".
//   - pending_grade: entrego, esperando que el docente califique.
//     CTA solo informativo ("Pendiente de calificacion").
//   - passed: aprobada. NO permite reentregar (decision Q4).
//   - failed_can_retry: reprobada pero puede reintentar. CTA
//     "Reenviar" + show intentos restantes.
//   - failed_permanent: reprobada y agoto intentos. NO permite
//     reentregar. Bloquea el progreso del modulo.
//
// Decisiones del analisis:
//   Q1: una row por intento (no afecta este lib, opera con counts).
//   Q2: solo submitted/graded cuentan como intento (caller pasa el
//       count ya filtrado).
//   Q3: solo el ultimo intento es calificable (caller pasa el
//       latestFinalGrade del ultimo).
//   Q4: aprobada = locked.
//   Q5: passing_grade aplica a obligatorias (caller decide si llamar).

export interface AssignmentStatusInput {
  // Maximo intentos del assignment. 0 = ilimitados.
  maxAttempts: number;
  // passing_grade del curso (porcentaje 0-100).
  passingGradePercent: number;
  // max_score del assignment.
  assignmentMaxScore: number;
  // Cuantas submissions del alumno estan en status 'submitted' o
  // 'graded'. Drafts NO cuentan. Caller filtra antes.
  submittedAttempts: number;
  // Grading de la submission mas reciente. null si la submission
  // mas reciente aun no esta calificada (o no hay submissions).
  latestFinalGrade: number | null;
}

export type AssignmentStatus =
  | { kind: "not_attempted" }
  | {
      kind: "pending_grade";
      attemptsUsed: number;
      // null si ilimitados (max_attempts=0). Numero si finito.
      attemptsRemaining: number | null;
    }
  | {
      kind: "passed";
      finalGrade: number;
      threshold: number;
    }
  | {
      kind: "failed_can_retry";
      finalGrade: number;
      threshold: number;
      attemptsUsed: number;
      // Siempre numero > 0 en este kind. attemptsRemaining=null
      // (ilimitados) cae en failed_can_retry tambien.
      attemptsRemaining: number | null;
    }
  | {
      kind: "failed_permanent";
      finalGrade: number;
      threshold: number;
      attemptsUsed: number;
    };

export function passingThreshold(
  assignmentMaxScore: number,
  passingGradePercent: number,
): number {
  return (passingGradePercent / 100) * assignmentMaxScore;
}

export function passes(finalGrade: number, threshold: number): boolean {
  return finalGrade >= threshold;
}

// Intentos restantes. null si ilimitados, sino max(0, max - used).
export function computeAttemptsRemaining(
  maxAttempts: number,
  submittedAttempts: number,
): number | null {
  if (maxAttempts === 0) return null;
  return Math.max(0, maxAttempts - submittedAttempts);
}

export function computeAssignmentStatus(
  input: AssignmentStatusInput,
): AssignmentStatus {
  const {
    maxAttempts,
    passingGradePercent,
    assignmentMaxScore,
    submittedAttempts,
    latestFinalGrade,
  } = input;

  if (submittedAttempts === 0) {
    return { kind: "not_attempted" };
  }

  // Hay al menos 1 intento entregado.
  const remaining = computeAttemptsRemaining(maxAttempts, submittedAttempts);

  if (latestFinalGrade === null) {
    // Entregado pero no calificado todavia.
    return {
      kind: "pending_grade",
      attemptsUsed: submittedAttempts,
      attemptsRemaining: remaining,
    };
  }

  const threshold = passingThreshold(assignmentMaxScore, passingGradePercent);

  if (passes(latestFinalGrade, threshold)) {
    return { kind: "passed", finalGrade: latestFinalGrade, threshold };
  }

  // No aprobo. Decidir si puede reintentar o quedo permanente.
  //   - max_attempts=0 (ilimitados): siempre can_retry.
  //   - max_attempts>0 y submittedAttempts < max_attempts: can_retry.
  //   - max_attempts>0 y submittedAttempts >= max_attempts: permanent.
  if (maxAttempts === 0 || submittedAttempts < maxAttempts) {
    return {
      kind: "failed_can_retry",
      finalGrade: latestFinalGrade,
      threshold,
      attemptsUsed: submittedAttempts,
      attemptsRemaining: remaining,
    };
  }

  return {
    kind: "failed_permanent",
    finalGrade: latestFinalGrade,
    threshold,
    attemptsUsed: submittedAttempts,
  };
}

// Helper booleano usado por progressService para decidir si la tarea
// cuenta para el progreso del curso. Solo cuenta si esta aprobada
// (decision del analisis ISSUE 3: una tarea entregada pero NO
// aprobada NO cuenta).
export function countsForProgress(status: AssignmentStatus): boolean {
  return status.kind === "passed";
}

// Helper booleano para que la UI / servicios sepan si el alumno
// puede reenviar (mostrar boton "Reenviar"). True para
// not_attempted y failed_can_retry. False para pending_grade
// (entregada y esperando calificacion), passed (ya aprobada) y
// failed_permanent (agoto intentos).
export function canResubmit(status: AssignmentStatus): boolean {
  return (
    status.kind === "not_attempted" || status.kind === "failed_can_retry"
  );
}
