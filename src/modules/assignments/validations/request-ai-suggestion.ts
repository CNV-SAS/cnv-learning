// Validation schema para POST /api/grading/suggest. Recibe solo
// submissionId; el service resuelve assignment + verifica policy.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const requestAiSuggestionSchema = z.object({
  submissionId: z.string().regex(UUID_FORMAT, "ID de entrega inválido"),
});

export type RequestAiSuggestionInput = z.infer<
  typeof requestAiSuggestionSchema
>;
