// Validacion del input para updateQuizQuestionAction (Bloque 23.2.b).
// Mismas reglas que createQuizQuestionSchema, sustituyendo
// assignmentId por questionId. El service usa replaceOptions (delete
// + insert) para sustituir el set completo de opciones; el UI envia
// todas las opciones cada vez aunque solo cambie una.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";
import {
  quizOptionInputSchema,
  hasExactlyOneCorrect,
} from "./quiz-option-input";

export const updateQuizQuestionSchema = z.object({
  questionId: z.string().regex(UUID_FORMAT, "ID de pregunta inválido"),
  prompt: z
    .string()
    .trim()
    .min(3, "La pregunta debe tener al menos 3 caracteres")
    .max(1000, "La pregunta no puede superar 1000 caracteres"),
  points: z
    .number()
    .min(0, "Los puntos deben ser >= 0")
    .max(100, "Los puntos deben ser <= 100"),
  options: z
    .array(quizOptionInputSchema)
    .min(2, "Cada pregunta requiere al menos 2 opciones")
    .max(6, "Máximo 6 opciones por pregunta")
    .refine(
      hasExactlyOneCorrect,
      "Debe haber exactamente una opción marcada como correcta.",
    ),
});

export type UpdateQuizQuestionInput = z.infer<
  typeof updateQuizQuestionSchema
>;
