// Validacion del input para deleteQuizQuestionAction (Bloque 23.2.b).
// Trivial: solo el UUID de la pregunta. CASCADE borra opciones.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const deleteQuizQuestionSchema = z.object({
  questionId: z.string().regex(UUID_FORMAT, "ID de pregunta inválido"),
});

export type DeleteQuizQuestionInput = z.infer<
  typeof deleteQuizQuestionSchema
>;
