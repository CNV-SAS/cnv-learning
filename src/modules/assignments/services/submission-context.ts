// Service helper compartido entre submissionService y quizService
// (Bloque post-23 ISSUE 3 sub-bloque 5). Encapsula la lectura del
// estado de submission del alumno para que ambos servicios apliquen
// el mismo guard de reenvio (computeAssignmentStatus + canResubmit).
//
// Antes del refactor, el guard era el simple "existing && status='
// submitted'" en cada servicio. Con multi-attempt + passing_grade +
// max_attempts, la logica vive en assignment-status.ts (lib puro) y
// este helper hace las queries de BD necesarias para alimentar el
// status.
//
// 4 queries paralelas: module + course + latestSubmission +
// submittedAttempts count. latestGrading depende del latestSubmission
// (1 query mas si hay submission). Para MVP con <100 submissions por
// curso es trivial.

import { moduleRepository } from "@/modules/courses/data/module.repository";
import { courseRepository } from "@/modules/courses/data/course.repository";
import {
  submissionRepository,
  gradingRepository,
} from "@/modules/assignments/data";
import {
  computeAssignmentStatus,
  type AssignmentStatus,
} from "@/modules/assignments/lib/assignment-status";
import {
  AppError,
  DomainError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { Assignment } from "@/modules/assignments/types";
import type { Course, Module } from "@/modules/courses/types";

export interface AssignmentSubmissionContext {
  status: AssignmentStatus;
  course: Course;
  module: Module;
}

export async function loadAssignmentSubmissionContext(
  userId: string,
  assignment: Assignment,
): Promise<Result<AssignmentSubmissionContext, AppError>> {
  const [module, latestSubmission, submittedAttempts] = await Promise.all([
    moduleRepository.findById(assignment.module_id),
    submissionRepository.findByAssignmentAndUser(assignment.id, userId),
    submissionRepository.countSubmittedAttemptsByAssignmentAndUser(
      assignment.id,
      userId,
    ),
  ]);

  if (!module) {
    return err(
      new NotFoundError(
        ErrorCodes.MODULE_NOT_FOUND,
        "Módulo no encontrado.",
      ),
    );
  }

  const course = await courseRepository.findById(module.course_id);
  if (!course) {
    return err(
      new NotFoundError(
        ErrorCodes.COURSE_NOT_FOUND,
        "Curso no encontrado.",
      ),
    );
  }

  // Grading del intento mas reciente (solo el latest es calificable
  // por decision Q3). Si la latest submission no tiene grading aun
  // (pending_grade), latestFinalGrade queda null.
  const latestGrading =
    latestSubmission !== null
      ? await gradingRepository.findBySubmissionId(latestSubmission.id)
      : null;

  const status = computeAssignmentStatus({
    maxAttempts: assignment.max_attempts,
    passingGradePercent: Number(course.passing_grade),
    assignmentMaxScore: Number(assignment.max_score),
    submittedAttempts,
    latestFinalGrade:
      latestGrading !== null ? Number(latestGrading.final_grade) : null,
  });

  return ok({ status, course, module });
}

// Mapea un status no-resumible al ErrorCode + mensaje user-facing
// apropiado. Caller verifica canResubmit(status) === false antes de
// llamar esto.
export function statusToResubmitError(status: AssignmentStatus): AppError {
  if (status.kind === "passed") {
    return new DomainError(
      ErrorCodes.SUBMISSION_ALREADY_PASSED,
      "Ya aprobaste esta tarea, no necesitas reenviarla.",
    );
  }
  if (status.kind === "pending_grade") {
    return new DomainError(
      ErrorCodes.SUBMISSION_PENDING_GRADE,
      "Tu entrega anterior aún está pendiente de calificación. Espera el feedback del docente antes de reenviar.",
    );
  }
  if (status.kind === "failed_permanent") {
    return new DomainError(
      ErrorCodes.SUBMISSION_MAX_ATTEMPTS_REACHED,
      `Has agotado los ${status.attemptsUsed} intento${status.attemptsUsed === 1 ? "" : "s"} disponible${status.attemptsUsed === 1 ? "" : "s"} sin aprobar la tarea.`,
    );
  }
  // not_attempted o failed_can_retry: este helper no se deberia
  // llamar para esos kinds. Devolvemos un error generico defensivo.
  return new DomainError(
    ErrorCodes.VALIDATION_FAILED,
    "No se puede reenviar esta tarea.",
  );
}
