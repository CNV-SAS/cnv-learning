// GET /api/quizzes/[assignmentId]/play
//
// Retorna el quiz al estudiante para que lo tome: assignment +
// questions + options SIN is_correct. Las options se traen via
// admin client en el repo (students sin SELECT en quiz_options
// per DATABASE.md); el select explicito omite is_correct, asi
// que el valor nunca cruza al cliente.
//
// Patron route handler thin (ARCHITECTURE.md regla 2):
//   1. Validar params (UUID).
//   2. Auth check.
//   3. Llamar service.
//   4. Map Result<T, AppError> -> NextResponse.json con status.
//
// Errores devueltos en shape consistente {ok: false, error: {code,
// message}} para que el cliente discrimine via response.ok del
// envelope (no del HTTP status que ya lo refleja).

import { NextResponse } from "next/server";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { quizService } from "@/modules/assignments/services/quiz.service";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";
import { UUID_FORMAT } from "@/lib/utils/uuid";
import {
  AppError,
  AuthenticationError,
  ValidationError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

function errorResponse(error: AppError): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: { code: error.code, message: error.message },
    },
    { status: error.statusCode },
  );
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
      const { assignmentId } = await params;
      if (!UUID_FORMAT.test(assignmentId)) {
        return errorResponse(
          new ValidationError(
            ErrorCodes.VALIDATION_FAILED,
            "ID de tarea inválido.",
          ),
        );
      }

      const user = await profileRepository.getCurrentUser();
      if (!user) {
        return errorResponse(
          new AuthenticationError(
            ErrorCodes.AUTH_SESSION_EXPIRED,
            "Tu sesión expiró.",
          ),
        );
      }

      const result = await quizService.getQuizForPlayer(assignmentId, user);
      if (!result.ok) return errorResponse(result.error);

      return NextResponse.json({
        ok: true,
        data: {
          assignment: {
            id: result.value.assignment.id,
            title: result.value.assignment.title,
            description: result.value.assignment.description,
            max_score: result.value.assignment.max_score,
            due_at: result.value.assignment.due_at,
          },
          questions: result.value.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            position: q.position,
            points: q.points,
          })),
          options: result.value.options,
        },
      });
    });
  } catch (e) {
    logger.error("GET /api/quizzes/.../play unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      {
        ok: false,
        error: { code: "UNEXPECTED", message: "Error inesperado." },
      },
      { status: 500 },
    );
  }
}
