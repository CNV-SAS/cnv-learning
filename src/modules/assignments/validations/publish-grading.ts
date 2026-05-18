// Validation schema para publishGradingAction.
//
// finalGrade solo valida >= 0 aqui; el upper bound depende del
// assignment.max_score, que el service obtiene del repo y valida
// con DomainError(GRADE_OUT_OF_RANGE) si excede.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const publishGradingSchema = z.object({
  submissionId: z.string().regex(UUID_FORMAT, "ID de entrega inválido"),
  finalGrade: z
    .number({ message: "La nota debe ser un número" })
    .min(0, "La nota no puede ser negativa"),
  feedback: z.string().min(1, "El feedback no puede estar vacío"),
});

export type PublishGradingInput = z.infer<typeof publishGradingSchema>;
