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
import {
  passes,
  passingThreshold,
} from "@/modules/assignments/lib/assignment-status";
import { auditRepository } from "@/modules/audit/data";
import { moduleRepository } from "@/modules/courses/data/module.repository";
import { courseRepository } from "@/modules/courses/data/course.repository";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { progressService } from "@/modules/progress/services/progress.service";
import { sendGradingPublishedEmail } from "@/lib/email";
import { notificationRepository } from "@/modules/notifications/data";
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
  // Bloque 8 sub-bloque 8.4: si el docente aplico una sugerencia
  // IA antes de publicar, persistimos el link aunque haya editado
  // los valores despues del Apply (audit trail: "esta sugerencia
  // influyo la decision", no "es identica a la nota final").
  aiSuggestionId?: string;
}

export const gradingService = {
  async publishGrading(
    params: PublishGradingParams,
  ): Promise<Result<Grading, AppError>> {
    const { user, submissionId, finalGrade, feedback, aiSuggestionId } =
      params;

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
      ai_suggestion_id: aiSuggestionId ?? null,
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
        aiSuggestionId: aiSuggestionId ?? null,
      },
    });

    // Delivery al estudiante: email (Bloque 6 sub-bloque 6.6) +
    // notification in-app (Bloque 10 sub-bloque 10.8). Ambos
    // fault-tolerant: cualquier fallo se loguea pero NO degrada el
    // resultado (grading + audit ya son persistidos; return ok).
    //
    // Resolvemos moduleRow + courseRow + studentProfile una sola
    // vez (los 3 deliveries los usan). Si alguno falta logueamos
    // skip; emails/notifications con contexto incompleto NO se
    // disparan (mejor missing notification que notification con
    // info falsa).
    const [moduleRow, studentProfile] = await Promise.all([
      moduleRepository.findById(assignment.module_id),
      profileRepository.findById(submission.user_id),
    ]);
    const courseRow = moduleRow
      ? await courseRepository.findById(moduleRow.course_id)
      : null;

    if (!moduleRow || !courseRow || !studentProfile) {
      logger.warn("Grading delivery skip: contexto incompleto", {
        gradingId: grading.id,
        hasModule: moduleRow !== null,
        hasCourse: courseRow !== null,
        hasStudent: studentProfile !== null,
      });
      return ok(grading);
    }

    try {
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
    } catch (e) {
      logger.warn("Email flow lanzo excepcion inesperada", {
        gradingId: grading.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Notification in-app: alimenta el bell del header + lista
    // de /notifications del estudiante. Independiente del email
    // (puede fallar uno y el otro llegar). Link al detalle del
    // assignment para que el click navegue al feedback completo.
    try {
      await notificationRepository.createBulk({
        userIds: [studentProfile.id],
        kind: "graded",
        title: `Recibiste tu calificación en ${assignment.title}`,
        body: `Nota: ${grading.final_grade} / ${assignment.max_score}`,
        link: `/learn/${courseRow.id}/assignment/${assignment.id}`,
        metadata: {
          submissionId,
          assignmentId: assignment.id,
          gradingId: grading.id,
          finalGrade: grading.final_grade,
          maxScore: assignment.max_score,
        },
      });
    } catch (e) {
      logger.warn("Notification in-app lanzo excepcion inesperada", {
        gradingId: grading.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Bloque post-23 ISSUE 3 sub-bloque 4: trigger de emision de
    // constancia relocalizado desde submission.service.
    // Si el grading aprueba el threshold del curso AND el assignment
    // es obligatorio, puede que esta calificacion lleve el curso al
    // 100%. Llamamos tryEmitCertificateForCourse que internamente
    // verifica el percentage y emite si corresponde (idempotente:
    // si ya emitio cert para este curso, kind='update' o
    // CERTIFICATE_ALREADY_ISSUED se loguean como warn).
    // Fault-tolerant: si la emision falla, log warn pero NO bloquea
    // el publishGrading (el grading + audit ya son ok).
    if (assignment.is_required === true) {
      try {
        const threshold = passingThreshold(
          Number(assignment.max_score),
          Number(courseRow.passing_grade),
        );
        if (passes(Number(grading.final_grade), threshold)) {
          await progressService.tryEmitCertificateForCourse(
            submission.user_id,
            courseRow.id,
          );
        }
      } catch (e) {
        logger.warn(
          "Certificate emission flow from publishGrading threw (non-blocking)",
          {
            gradingId: grading.id,
            error: e instanceof Error ? e.message : String(e),
          },
        );
      }
    }

    return ok(grading);
  },
};
