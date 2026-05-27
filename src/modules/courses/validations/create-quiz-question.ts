// Validacion del input para createQuizQuestionAction (Bloque 23.2.b).
//
// Reglas plan B23 Q4:
//   - minimo 2 opciones, maximo 6.
//   - exactamente 1 opcion marcada correcta.
//   - prompt 3-1000 chars.
//   - points 0-100 (numerico, decimales OK).

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";
import {
  quizOptionInputSchema,
  hasExactlyOneCorrect,
} from "./quiz-option-input";

export const createQuizQuestionSchema = z.object({
  assignmentId: z.string().regex(UUID_FORMAT, "ID de tarea inválido"),
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

export type CreateQuizQuestionInput = z.infer<
  typeof createQuizQuestionSchema
>;
