// POST /api/quizzes/[assignmentId]/submit
//
// Recibe las respuestas del estudiante, califica server-side via
// quizService.submitQuiz, persiste submission + grading + audit
// (atomicidad limitada documentada en el service), y retorna el
// resultado {finalGrade, maxScore, correctCount, totalCount}.
//
// is_correct se evalua server-side via admin client (quizRepository
// .listOptionsForGrading) y nunca llega al cliente. La respuesta
// solo contiene la nota agregada.

import { NextResponse } from "next/server";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { quizService } from "@/modules/assignments/services/quiz.service";
import { submitQuizSchema } from "@/modules/assignments/validations";
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

export async function POST(
  request: Request,
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

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse(
          new ValidationError(
            ErrorCodes.VALIDATION_FAILED,
            "Body inválido.",
          ),
        );
      }

      // El client envia { answers }. assignmentId viene del path y
      // lo agregamos al input para que el schema valide ambos.
      const merged =
        body && typeof body === "object"
          ? { ...(body as Record<string, unknown>), assignmentId }
          : { assignmentId };
      const parsed = submitQuizSchema.safeParse(merged);
      if (!parsed.success) {
        return errorResponse(
          new ValidationError(
            ErrorCodes.VALIDATION_FAILED,
            parsed.error.issues[0]?.message ?? "Datos inválidos.",
          ),
        );
      }

      const result = await quizService.submitQuiz(
        user,
        parsed.data.assignmentId,
        parsed.data.answers,
      );
      if (!result.ok) return errorResponse(result.error);

      return NextResponse.json({ ok: true, data: result.value });
    });
  } catch (e) {
    logger.error("POST /api/quizzes/.../submit unexpected throw", {
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
