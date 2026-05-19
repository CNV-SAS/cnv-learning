// POST /api/grading/suggest
//
// Genera una sugerencia IA para una submission. Patron de route
// handler thin (ARCHITECTURE.md regla 2): valida body + auth +
// llama service + mapea Result<T, AppError> -> NextResponse via
// helper compartido lib/api/errors.
//
// El service persiste el outcome (incluso fallos con status
// "timeout" / "parse_failed" / "provider_error") para audit y
// observabilidad. Si el suggest fallo, el AppError preserva el
// code original (AI_TIMEOUT / AI_RATE_LIMITED / AI_PROVIDER_ERROR
// / AI_PARSE_FAILED) para que el client UI muestre mensaje
// especifico al docente.

import { NextResponse } from "next/server";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { aiGradingService } from "@/modules/assignments/services";
import { requestAiSuggestionSchema } from "@/modules/assignments/validations";
import { errorResponse, unexpectedResponse } from "@/lib/api/errors";
import { logger } from "@/core/logger/logger";
import { withContext } from "@/core/logger/context";
import {
  AuthenticationError,
  ValidationError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    return await withContext({ requestId }, async () => {
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

      const parsed = requestAiSuggestionSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(
          new ValidationError(
            ErrorCodes.VALIDATION_FAILED,
            parsed.error.issues[0]?.message ?? "Datos inválidos.",
          ),
        );
      }

      const result = await aiGradingService.generateSuggestion(
        user,
        parsed.data.submissionId,
      );
      if (!result.ok) return errorResponse(result.error);

      return NextResponse.json({
        ok: true,
        data: { suggestion: result.value },
      });
    });
  } catch (e) {
    logger.error("POST /api/grading/suggest unexpected throw", {
      error: e instanceof Error ? e.message : String(e),
    });
    return unexpectedResponse();
  }
}
