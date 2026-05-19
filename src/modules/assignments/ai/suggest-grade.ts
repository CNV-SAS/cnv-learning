// Capability IA: sugerir grade + feedback para una submission.
//
// Orquesta: build prompt -> aiProvider.complete -> JSON.parse ->
// Zod validate -> return. Errores tipados:
//   - Provider errors (timeout, rate limit, network) bubblean del
//     provider sin modificacion.
//   - JSON.parse fail -> DomainError(AI_PARSE_FAILED).
//   - Zod schema fail -> DomainError(AI_PARSE_FAILED) (mismo code,
//     mensaje refiere "estructura inesperada" para diferenciar
//     debugging).
//
// El service caller persiste la sugerencia en ai_grading_suggestions
// con status segun el outcome (success / timeout / parse_failed /
// provider_error). Esta capability solo retorna Result; el callsite
// hace el persistance + audit.

import { aiProvider } from "@/lib/ai/provider";
import {
  gradePromptV1,
  GRADE_PROMPT_VERSION,
} from "./prompts/grade.v1";
import { gradeOutputSchema } from "./schema";
import { type AppError, DomainError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import { logger } from "@/core/logger/logger";
import type { Assignment, Submission } from "@/modules/assignments/types";

export interface GradeSuggestion {
  suggestedGrade: number;
  generatedFeedback: string;
  rawText: string;
  latencyMs: number;
  model: string;
  promptVersion: string;
}

export async function suggestGrade(
  submission: Submission,
  assignment: Assignment,
): Promise<Result<GradeSuggestion, AppError>> {
  const prompt = gradePromptV1({ submission, assignment });

  const response = await aiProvider.complete(prompt, { task: "grading" });
  if (!response.ok) return response;

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.value.text);
  } catch (e) {
    logger.warn("AI suggest-grade: JSON.parse fallo", {
      error: e instanceof Error ? e.message : String(e),
      rawTextPreview: response.value.text.slice(0, 200),
    });
    return err(
      new DomainError(
        ErrorCodes.AI_PARSE_FAILED,
        "La respuesta de IA no es JSON válido.",
      ),
    );
  }

  const validated = gradeOutputSchema.safeParse(parsed);
  if (!validated.success) {
    logger.warn("AI suggest-grade: schema validation fallo", {
      issues: validated.error.issues,
    });
    return err(
      new DomainError(
        ErrorCodes.AI_PARSE_FAILED,
        "La respuesta de IA no tiene la estructura esperada.",
      ),
    );
  }

  return ok({
    suggestedGrade: validated.data.suggestedGrade,
    generatedFeedback: validated.data.generatedFeedback,
    rawText: response.value.text,
    latencyMs: response.value.latencyMs,
    model: response.value.model,
    promptVersion: GRADE_PROMPT_VERSION,
  });
}
