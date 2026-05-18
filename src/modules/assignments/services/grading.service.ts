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
//   7. Email al estudiante via Resend (Bloque 6 sub-bloque 6.6;
//      fault-tolerant: no rompe el flow si falla).

import {
  assignmentRepository,
  submissionRepository,
  gradingRepository,
} from "@/modules/assignments/data";
import { canGradeAssignment } from "@/modules/assignments/policies";
import { auditRepository } from "@/modules/audit/data";
import { moduleRepository } from "@/modules/courses/data/module.repository";
import { courseRepository } from "@/modules/courses/data/course.repository";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { sendGradingPublishedEmail } from "@/lib/email";
import { logger } from "@/core/logger/logger";
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

    // Email al estudiante (Bloque 6 sub-bloque 6.6). Resolve
    // courseTitle via module -> course + studentProfile en paralelo.
    // Fault-tolerant: cualquier fallo se loguea pero NO degrada
    // el resultado (grading + audit ya son persistidos; return ok).
    try {
      const [moduleRow, studentProfile] = await Promise.all([
        moduleRepository.findById(assignment.module_id),
        profileRepository.findById(submission.user_id),
      ]);
      const courseRow = moduleRow
        ? await courseRepository.findById(moduleRow.course_id)
        : null;

      if (moduleRow && courseRow && studentProfile) {
        await sendGradingPublishedEmail({
          studentEmail: studentProfile.email,
          studentName: studentProfile.full_name,
          courseTitle: courseRow.title,
          courseId: courseRow.id,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          finalGrade: grading.final_grade,
          maxScore: assignment.max_score,
          feedback: grading.feedback,
        });
      } else {
        logger.warn("Email skip: contexto incompleto", {
          gradingId: grading.id,
          hasModule: moduleRow !== null,
          hasCourse: courseRow !== null,
          hasStudent: studentProfile !== null,
        });
      }
    } catch (e) {
      logger.warn("Email flow lanzo excepcion inesperada", {
        gradingId: grading.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    return ok(grading);
  },
};
