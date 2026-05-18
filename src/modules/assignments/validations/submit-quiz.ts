// Validation schema para POST /api/quizzes/[id]/submit. answers es
// un objeto donde la clave es el questionId y el valor es el
// optionId elegido por el estudiante.
//
// UUID format regex compartido (no z.string().uuid() para soportar
// el seed determinista v0; ver lib/utils/uuid.ts).

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const submitQuizSchema = z.object({
  assignmentId: z.string().regex(UUID_FORMAT, "ID de tarea inválido"),
  answers: z.record(
    z.string().regex(UUID_FORMAT, "ID de pregunta inválido"),
    z.string().regex(UUID_FORMAT, "ID de opción inválido"),
  ),
});

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
