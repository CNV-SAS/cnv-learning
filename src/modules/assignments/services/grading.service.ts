// Service: orquestador de calificacion del docente. ARCHITECTURE.md
// regla 2 (action thin -> service).
//
// Flow:
//   1. Fetch submission por id (RLS valida que el teacher tenga
//      acceso al curso de esta submission).
//   2. Policy canGradeAssignment.
//   3. Fetch assignment para validar finalGrade <= max_score.
//   4. Check no existe grading previa (SUBMISSION_ALREADY_GRADED).
//   5. Insert grading.
//   6. Audit log via auditRepository (service role; fault-tolerant).
//
// El email de notificacion al estudiante entra en sub-bloque 6.6
// como step adicional aqui o como handler de evento.

import {
  assignmentRepository,
  submissionRepository,
  gradingRepository,
} from "@/modules/assignments/data";
import { canGradeAssignment } from "@/modules/assignments/policies";
import { auditRepository } from "@/modules/audit/data";
import {
  AppError,
  AuthorizationError,
  DomainError,
  NotFoundError,
  ValidationError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { Grading } from "../types";

interface PublishGradingParams {
  user: AuthenticatedUser;
  submissionId: string;
  finalGrade: number;
  feedback: string;
}

export const gradingService = {
  async publishGrading(
    params: PublishGradingParams,
  ): Promise<Result<Grading, AppError>> {
    const { user, submissionId, finalGrade, feedback } = params;

    const submission = await submissionRepository.findById(submissionId);
    const allowed = canGradeAssignment(user, {
      submissionExists: submission !== null,
    });
    if (!allowed || !submission) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_GRADE,
          "No puedes calificar esta entrega.",
        ),
      );
    }

    const assignment = await assignmentRepository.findById(
      submission.assignment_id,
    );
    if (!assignment) {
      return err(
        new NotFoundError(
          ErrorCodes.ASSIGNMENT_NOT_FOUND,
          "Tarea no encontrada.",
        ),
      );
    }

    if (finalGrade > assignment.max_score) {
      return err(
        new ValidationError(
          ErrorCodes.GRADE_OUT_OF_RANGE,
          `La nota no puede exceder ${assignment.max_score}.`,
        ),
      );
    }

    const existing = await gradingRepository.findBySubmissionId(submissionId);
    if (existing) {
      return err(
        new DomainError(
          ErrorCodes.SUBMISSION_ALREADY_GRADED,
          "Esta entrega ya fue calificada.",
        ),
      );
    }

    const grading = await gradingRepository.create({
      submission_id: submissionId,
      graded_by: user.id,
      final_grade: finalGrade,
      feedback,
    });

    // Audit log (regla 8 ARCHITECTURE.md). Fault-tolerant: no
    // bloquea el flow si falla.
    await auditRepository.record({
      event: "grading.published",
      resourceType: "grading",
      resourceId: grading.id,
      actorId: user.id,
      actorEmail: user.email,
      metadata: {
        submissionId,
        assignmentId: submission.assignment_id,
        finalGrade,
        maxScore: assignment.max_score,
      },
    });

    return ok(grading);
  },
};
