// Service: orquestador del editor de quiz (Bloque 23.2.b). Paralelo
// a courseContentEditorService para modules/lessons/assignments, en
// archivo separado para no saturar.
//
// 5 operaciones:
//   1. listQuizContent: lista preguntas + opciones del editor.
//   2. createQuestion: question + opciones via repo atomico + audit.
//   3. updateQuestion: update question + replace opciones + audit.
//   4. deleteQuestion: delete CASCADE opciones + audit con snapshot.
//   5. reorderQuestion: resolve neighbor + RPC swap + audit.
//
// Policy de autorizacion: canEditCourseContent (admin OR teacher
// asignado al curso del assignment). Compartida con el editor de
// modulos/lecciones porque editar quiz es subset de "editar
// contenido del curso". El admin tambien puede via "Admins manage"
// RLS + policy TS canEditCourseContent.
//
// Las RLS de quiz_questions/quiz_options (0017 + 0033) hacen
// defense-in-depth en el SQL boundary.

import { quizRepository } from "@/modules/assignments/data/quiz.repository";
import { assignmentRepository } from "@/modules/assignments/data/assignment.repository";
import { moduleRepository } from "@/modules/courses/data";
import { courseRepository } from "@/modules/courses/data";
import { canEditCourseContent } from "@/modules/courses/policies";
import { auditRepository } from "@/modules/audit/data";
import {
  AppError,
  AuthorizationError,
  DomainError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type {
  QuizOption,
  QuizQuestion,
} from "@/modules/assignments/types";
import type {
  QuestionWithOptions,
  QuizOptionInput,
} from "@/modules/assignments/data/quiz.repository";

// Resuelve assignment + module + courseId, y verifica policy. El
// resultado incluye el assignment para que el caller decida cuando
// validar assignment.type === 'quiz_multiple_choice'.
async function authorizeQuizEdit(
  user: AuthenticatedUser,
  assignmentId: string,
): Promise<
  Result<
    { assignment: NonNullable<Awaited<ReturnType<typeof assignmentRepository.findById>>>; courseId: string },
    AppError
  >
> {
  const assignment = await assignmentRepository.findById(assignmentId);
  if (!assignment) {
    return err(
      new NotFoundError(
        ErrorCodes.ASSIGNMENT_NOT_FOUND,
        "Tarea no encontrada.",
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

  const module = await moduleRepository.findById(assignment.module_id);
  if (!module) {
    return err(
      new NotFoundError(ErrorCodes.MODULE_NOT_FOUND, "Módulo no encontrado."),
    );
  }

  const isTeacherOfCourse =
    user.role === "teacher"
      ? await courseRepository.isTeacherOfCourse(user.id, module.course_id)
      : false;

  const allowed = canEditCourseContent(user, {
    courseExists: true,
    isTeacherOfCourse,
  });
  if (!allowed) {
    return err(
      new AuthorizationError(
        ErrorCodes.AUTHZ_CANNOT_EDIT_COURSE_CONTENT,
        "No puedes editar el contenido de este curso.",
      ),
    );
  }

  return ok({ assignment, courseId: module.course_id });
}

interface CreateQuestionParams {
  user: AuthenticatedUser;
  assignmentId: string;
  prompt: string;
  points: number;
  options: QuizOptionInput[];
}

interface UpdateQuestionParams {
  user: AuthenticatedUser;
  questionId: string;
  prompt: string;
  points: number;
  options: QuizOptionInput[];
}

interface DeleteQuestionParams {
  user: AuthenticatedUser;
  questionId: string;
}

interface ReorderQuestionParams {
  user: AuthenticatedUser;
  questionId: string;
  direction: "up" | "down";
}

export const quizEditorService = {
  async listQuizContent(params: {
    user: AuthenticatedUser;
    assignmentId: string;
  }): Promise<Result<QuestionWithOptions[], AppError>> {
    const auth = await authorizeQuizEdit(params.user, params.assignmentId);
    if (!auth.ok) return err(auth.error);

    const content = await quizRepository.listQuestionsWithOptionsForEditor(
      params.assignmentId,
    );
    return ok(content);
  },

  async createQuestion(
    params: CreateQuestionParams,
  ): Promise<Result<QuestionWithOptions, AppError>> {
    const auth = await authorizeQuizEdit(params.user, params.assignmentId);
    if (!auth.ok) return err(auth.error);

    const maxPosition = await quizRepository.maxQuestionPosition(
      params.assignmentId,
    );
    const nextPosition = (maxPosition ?? 0) + 1;

    const created = await quizRepository.createQuestionWithOptions({
      assignmentId: params.assignmentId,
      prompt: params.prompt,
      points: params.points,
      position: nextPosition,
      options: params.options,
    });

    await auditRepository.record({
      event: "quiz_question.created",
      resourceType: "quiz_question",
      resourceId: created.question.id,
      actorId: params.user.id,
      actorEmail: params.user.email,
      metadata: {
        assignmentId: params.assignmentId,
        position: nextPosition,
        optionCount: params.options.length,
      },
    });

    return ok(created);
  },

  async updateQuestion(
    params: UpdateQuestionParams,
  ): Promise<Result<QuestionWithOptions, AppError>> {
    const question = await quizRepository.findQuestionById(params.questionId);
    if (!question) {
      return err(
        new NotFoundError(
          ErrorCodes.QUIZ_QUESTION_NOT_FOUND,
          "Pregunta no encontrada.",
        ),
      );
    }

    const auth = await authorizeQuizEdit(params.user, question.assignment_id);
    if (!auth.ok) return err(auth.error);

    const updated = await quizRepository.updateQuestion({
      questionId: params.questionId,
      prompt: params.prompt,
      points: params.points,
    });

    const options = await quizRepository.replaceOptions({
      questionId: params.questionId,
      options: params.options,
    });

    await auditRepository.record({
      event: "quiz_question.updated",
      resourceType: "quiz_question",
      resourceId: params.questionId,
      actorId: params.user.id,
      actorEmail: params.user.email,
      metadata: {
        assignmentId: question.assignment_id,
        optionCount: params.options.length,
      },
    });

    return ok({ question: updated, options });
  },

  async deleteQuestion(
    params: DeleteQuestionParams,
  ): Promise<Result<void, AppError>> {
    const question = await quizRepository.findQuestionById(params.questionId);
    if (!question) {
      return err(
        new NotFoundError(
          ErrorCodes.QUIZ_QUESTION_NOT_FOUND,
          "Pregunta no encontrada.",
        ),
      );
    }

    const auth = await authorizeQuizEdit(params.user, question.assignment_id);
    if (!auth.ok) return err(auth.error);

    // Audit ANTES del delete con snapshot de la pregunta (id de
    // opciones se pierden con el CASCADE pero el contenido textual
    // queda preservado en el evento).
    await auditRepository.record({
      event: "quiz_question.deleted",
      resourceType: "quiz_question",
      resourceId: params.questionId,
      actorId: params.user.id,
      actorEmail: params.user.email,
      metadata: {
        assignmentId: question.assignment_id,
        position: question.position,
        prompt: question.prompt,
        points: question.points,
      },
    });

    await quizRepository.deleteQuestion(params.questionId);
    return ok(undefined);
  },

  async reorderQuestion(
    params: ReorderQuestionParams,
  ): Promise<Result<void, AppError>> {
    const question = await quizRepository.findQuestionById(params.questionId);
    if (!question) {
      return err(
        new NotFoundError(
          ErrorCodes.QUIZ_QUESTION_NOT_FOUND,
          "Pregunta no encontrada.",
        ),
      );
    }

    const auth = await authorizeQuizEdit(params.user, question.assignment_id);
    if (!auth.ok) return err(auth.error);

    // Buscar la pregunta vecina en la direccion solicitada.
    const all = await quizRepository.listQuestionsWithOptionsForEditor(
      question.assignment_id,
    );
    const sorted = all
      .map((row) => row.question)
      .sort((a, b) => a.position - b.position);
    const currentIdx = sorted.findIndex((q) => q.id === question.id);
    const neighborIdx =
      params.direction === "up" ? currentIdx - 1 : currentIdx + 1;
    if (neighborIdx < 0 || neighborIdx >= sorted.length) {
      return err(
        new DomainError(
          ErrorCodes.QUIZ_REORDER_NO_NEIGHBOR,
          params.direction === "up"
            ? "La pregunta ya está al inicio."
            : "La pregunta ya está al final.",
        ),
      );
    }

    const neighbor = sorted[neighborIdx];
    await quizRepository.swapQuestionPositions({
      assignmentId: question.assignment_id,
      posA: question.position,
      posB: neighbor.position,
    });

    await auditRepository.record({
      event: "quiz_question.reordered",
      resourceType: "quiz_question",
      resourceId: question.id,
      actorId: params.user.id,
      actorEmail: params.user.email,
      metadata: {
        assignmentId: question.assignment_id,
        direction: params.direction,
        previousPosition: question.position,
        newPosition: neighbor.position,
      },
    });

    return ok(undefined);
  },
};

// Type re-exports para consumers de la service.
export type { QuestionWithOptions, QuizQuestion, QuizOption };
