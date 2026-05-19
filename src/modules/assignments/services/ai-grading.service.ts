// Service: genera una sugerencia IA y persiste el outcome.
// ARCHITECTURE.md regla 2 (action/route thin -> service).
//
// Flow:
//   1. Fetch submission (RLS valida acceso del teacher al curso).
//   2. Policy canRequestAiSuggestion + submissionExists.
//   3. Fetch assignment.
//   4. Block quiz_multiple_choice (no aplica IA per plan).
//   5. Call suggestGrade capability.
//   6. Persistir SIEMPRE en ai_grading_suggestions (incluso fallos:
//      status='timeout' | 'parse_failed' | 'provider_error'). Esto
//      preserva trazabilidad de intentos fallidos para tuning del
//      prompt + observabilidad.
//   7. Audit log (regla 8). Fault-tolerant.
//   8. Retornar la suggestion persistida si success; AppError del
//      provider si failed (UI muestra mensaje al docente).

import { submissionRepository } from "@/modules/assignments/data/submission.repository";
import { assignmentRepository } from "@/modules/assignments/data/assignment.repository";
import { aiGradingSuggestionRepository } from "@/modules/assignments/data/ai-grading-suggestion.repository";
import { canRequestAiSuggestion } from "@/modules/assignments/policies";
import { suggestGrade } from "@/modules/assignments/ai/suggest-grade";
import { auditRepository } from "@/modules/audit/data";
import {
  type AppError,
  AuthorizationError,
  DomainError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { Database } from "@/types/database.generated";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { AiGradingSuggestion } from "../types";

const PROVIDER = "gemini";
const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_PROMPT_VERSION = "grade.v1";

type Json = Database["public"]["Tables"]["ai_grading_suggestions"]["Insert"]["raw_response"];

type SuggestionStatus =
  | "success"
  | "timeout"
  | "parse_failed"
  | "provider_error";

function statusFromErrorCode(code: string): SuggestionStatus {
  if (code === ErrorCodes.AI_TIMEOUT) return "timeout";
  if (code === ErrorCodes.AI_PARSE_FAILED) return "parse_failed";
  // AI_RATE_LIMITED + AI_PROVIDER_ERROR + cualquier otro: provider_error.
  // El comentario SQL del campo status enumera 4 valores; AI_RATE_LIMITED
  // se mapea aqui pero el Result.error preserva el code para que el UI
  // muestre mensaje user-friendly especifico (espera y reintenta).
  return "provider_error";
}

export const aiGradingService = {
  async generateSuggestion(
    user: AuthenticatedUser,
    submissionId: string,
  ): Promise<Result<AiGradingSuggestion, AppError>> {
    const submission = await submissionRepository.findById(submissionId);
    const allowed = canRequestAiSuggestion(user, {
      submissionExists: submission !== null,
    });
    if (!allowed || !submission) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_GRADE,
          "No puedes solicitar sugerencia IA para esta entrega.",
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

    if (assignment.type === "quiz_multiple_choice") {
      return err(
        new DomainError(
          ErrorCodes.ASSIGNMENT_TYPE_MISMATCH,
          "Los quizzes se califican automáticamente y no requieren sugerencia IA.",
        ),
      );
    }

    const startTime = Date.now();
    const result = await suggestGrade(submission, assignment);

    let status: SuggestionStatus;
    let suggestedGrade: number | null = null;
    let generatedFeedback: string | null = null;
    let rawResponse: Json = null;
    let latencyMs: number;
    let model = DEFAULT_MODEL;
    let promptVersion = DEFAULT_PROMPT_VERSION;

    if (result.ok) {
      status = "success";
      suggestedGrade = result.value.suggestedGrade;
      generatedFeedback = result.value.generatedFeedback;
      rawResponse = { text: result.value.rawText } as Json;
      latencyMs = result.value.latencyMs;
      model = result.value.model;
      promptVersion = result.value.promptVersion;
    } else {
      status = statusFromErrorCode(result.error.code);
      latencyMs = Date.now() - startTime;
      rawResponse = {
        errorCode: result.error.code,
        errorMessage: result.error.message,
      } as Json;
    }

    const suggestion = await aiGradingSuggestionRepository.create({
      submission_id: submissionId,
      generated_by: user.id,
      provider: PROVIDER,
      model,
      prompt_version: promptVersion,
      suggested_grade: suggestedGrade,
      generated_feedback: generatedFeedback,
      raw_response: rawResponse,
      status,
      latency_ms: latencyMs,
      cost_tokens: null,
    });

    // Audit (regla 8 ARCHITECTURE.md). Fault-tolerant per repo.
    await auditRepository.record({
      event: "ai_suggestion.generated",
      resourceType: "ai_grading_suggestion",
      resourceId: suggestion.id,
      actorId: user.id,
      actorEmail: user.email,
      metadata: {
        submissionId,
        assignmentId: submission.assignment_id,
        status,
        latencyMs,
        promptVersion,
        suggestedGrade,
      },
    });

    // Si el suggest fallo, devolvemos el AppError original (con su
    // code especifico para que el UI distinga timeout / rate_limit /
    // provider_error). La sugerencia con status correspondiente ya
    // quedo persistida arriba para audit.
    if (!result.ok) return err(result.error);

    return ok(suggestion);
  },
};
