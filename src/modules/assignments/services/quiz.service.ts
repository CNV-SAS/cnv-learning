// Service: orquestador del quiz. Dos flujos publicos:
//
//   - getQuizForPlayer(assignmentId, user): valida policy, fetch
//     questions + options SIN is_correct, retorna shape para el
//     player. Idempotente: invocable varias veces antes del submit
//     (e.g. recargar el quiz).
//
//   - submitQuiz(user, assignmentId, answers): valida policy, fetch
//     is_correct via admin client, califica server-side, persiste
//     submission + grading + audit. Atomicidad limitada (Supabase
//     JS sin transacciones cliente):
//       1. Computa score puro (sin escribir).
//       2. submission.upsert (idempotente por ON CONFLICT).
//       3. Check grading previo (idempotente para retry).
//       4. grading insert via admin client.
//       5. audit log.
//     Si falla 3 -> 4: submission queda sin grading. El siguiente
//     intento del usuario detecta el caso por la primera defensa
//     (existing && status='submitted' -> error
//     SUBMISSION_ALREADY_SUBMITTED) y el grading queda perdido.
//     Comment documenta el edge case; recover manual via admin
//     post-MVP si se observa.

import { assignmentRepository } from "@/modules/assignments/data/assignment.repository";
import { submissionRepository } from "@/modules/assignments/data/submission.repository";
import { gradingRepository } from "@/modules/assignments/data/grading.repository";
import { quizRepository } from "@/modules/assignments/data/quiz.repository";
import { moduleRepository } from "@/modules/courses/data";
import { canSubmitAssignment } from "@/modules/assignments/policies";
import { progressService } from "@/modules/progress/services/progress.service";
import { auditRepository } from "@/modules/audit/data";
import { gradeQuiz } from "../lib/quiz-grader";
import {
  AppError,
  AuthorizationError,
  DomainError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import { logger } from "@/core/logger/logger";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type {
  Assignment,
  QuizQuestion,
} from "@/modules/assignments/types";
import type { QuizOptionPublic } from "@/modules/assignments/data/quiz.repository";

export interface QuizForPlayer {
  assignment: Assignment;
  questions: QuizQuestion[];
  options: QuizOptionPublic[];
}

export interface QuizSubmitResult {
  finalGrade: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
}

export const quizService = {
  async getQuizForPlayer(
    assignmentId: string,
    user: AuthenticatedUser,
  ): Promise<Result<QuizForPlayer, AppError>> {
    const assignment = await assignmentRepository.findById(assignmentId);
    const allowed = canSubmitAssignment(user, {
      assignmentExists: assignment !== null,
      dueAt: assignment?.due_at ? new Date(assignment.due_at) : null,
    });
    if (!allowed || !assignment) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_SUBMIT_ASSIGNMENT,
          "No puedes acceder a este quiz.",
        ),
      );
    }

    if (assignment.type !== "quiz_multiple_choice") {
      return err(
        new DomainError(
          ErrorCodes.ASSIGNMENT_TYPE_MISMATCH,
          "Esta tarea no es un quiz.",
        ),
      );
    }

    // Si ya tomo el quiz, devolver error claro (la UI direcciona al
    // GradeDisplay en lugar de mostrar el player).
    const existing = await submissionRepository.findByAssignmentAndUser(
      assignmentId,
      user.id,
    );
    if (existing && existing.status === "submitted") {
      return err(
        new DomainError(
          ErrorCodes.SUBMISSION_ALREADY_SUBMITTED,
          "Ya completaste este quiz.",
        ),
      );
    }

    const questions =
      await quizRepository.listQuestionsForAssignment(assignmentId);
    const options = await quizRepository.listOptionsForPlayer(
      questions.map((q) => q.id),
    );

    return ok({ assignment, questions, options });
  },

  async submitQuiz(
    user: AuthenticatedUser,
    assignmentId: string,
    answers: Record<string, string>,
  ): Promise<Result<QuizSubmitResult, AppError>> {
    const assignment = await assignmentRepository.findById(assignmentId);
    const allowed = canSubmitAssignment(user, {
      assignmentExists: assignment !== null,
      dueAt: assignment?.due_at ? new Date(assignment.due_at) : null,
    });
    if (!allowed || !assignment) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_SUBMIT_ASSIGNMENT,
          "No puedes entregar este quiz.",
        ),
      );
    }

    if (assignment.type !== "quiz_multiple_choice") {
      return err(
        new DomainError(
          ErrorCodes.ASSIGNMENT_TYPE_MISMATCH,
          "Esta tarea no es un quiz.",
        ),
      );
    }

    const existing = await submissionRepository.findByAssignmentAndUser(
      assignmentId,
      user.id,
    );
    if (existing && existing.status === "submitted") {
      return err(
        new DomainError(
          ErrorCodes.SUBMISSION_ALREADY_SUBMITTED,
          "Ya completaste este quiz.",
        ),
      );
    }

    // Fetch questions + options con is_correct (admin client).
    const questions =
      await quizRepository.listQuestionsForAssignment(assignmentId);
    const options = await quizRepository.listOptionsForGrading(
      questions.map((q) => q.id),
    );

    // Score raw antes de cualquier write. gradeQuiz retorna en escala
    // de points del quiz (sum de question.points). Normalizamos a la
    // escala del assignment.max_score para persistir grading
    // consistente con file_upload/essay (que guardan grade en la
    // escala oficial 0..max_score).
    const result = gradeQuiz(questions, options, answers);
    const finalGrade =
      result.maxScore > 0
        ? Math.round((result.score / result.maxScore) * assignment.max_score)
        : 0;

    // 1) Upsert submission (idempotente).
    const submission = await submissionRepository.upsert({
      assignment_id: assignmentId,
      user_id: user.id,
      status: "submitted",
      quiz_answers: answers,
      submitted_at: new Date().toISOString(),
    });

    // 2) Check grading previo (idempotencia ante retry).
    const existingGrading = await gradingRepository.findBySubmissionId(
      submission.id,
    );
    if (existingGrading) {
      logger.warn("submitQuiz: grading ya existe, retornando existente", {
        submissionId: submission.id,
      });
      return ok({
        finalGrade: existingGrading.final_grade,
        maxScore: assignment.max_score,
        correctCount: result.correctCount,
        totalCount: result.totalCount,
      });
    }

    // 3) Insert grading con admin client (students sin INSERT policy
    // en gradings; comment justificando en gradingRepository.createAsAdmin).
    // Feedback mantiene el desglose en escala raw (correctCount/
    // totalCount + raw score) que es info pedagogica para el
    // estudiante. El final_grade persiste en escala assignment.
    const feedback = `Acertaste ${result.correctCount} de ${result.totalCount} preguntas. Puntaje: ${result.score}/${result.maxScore}.`;

    const grading = await gradingRepository.createAsAdmin({
      submission_id: submission.id,
      graded_by: user.id,
      final_grade: finalGrade,
      feedback,
    });

    // 4) Audit log (regla 8 ARCHITECTURE.md). Fault-tolerant: no
    // bloquea el flow si falla.
    await auditRepository.record({
      event: "grading.auto_published",
      resourceType: "grading",
      resourceId: grading.id,
      actorId: user.id,
      actorEmail: user.email,
      metadata: {
        submissionId: submission.id,
        assignmentId,
        finalGrade,
        assignmentMaxScore: assignment.max_score,
        rawScore: result.score,
        rawMaxScore: result.maxScore,
        correctCount: result.correctCount,
        totalCount: result.totalCount,
        gradedBy: "auto",
      },
    });

    // 5) Bloque post-23: si el quiz era OBLIGATORIO, puede que el
    // curso llegue al 100% por esta entrega. Disparamos el helper
    // de progressService (fault-tolerant; no bloquea el return).
    if (assignment.is_required === true) {
      try {
        const moduleRow = await moduleRepository.findById(assignment.module_id);
        if (moduleRow) {
          await progressService.tryEmitCertificateForCourse(
            user.id,
            moduleRow.course_id,
          );
        }
      } catch (e) {
        logger.warn(
          "Certificate emission flow from submitQuiz threw (non-blocking)",
          {
            userId: user.id,
            assignmentId,
            error: e instanceof Error ? e.message : String(e),
          },
        );
      }
    }

    return ok({
      finalGrade,
      maxScore: assignment.max_score,
      correctCount: result.correctCount,
      totalCount: result.totalCount,
    });
  },
};
