// Schema base de una opcion de quiz (Bloque 23.2.b). Reusable entre
// createQuizQuestionSchema y updateQuizQuestionSchema.
//
// position en 1..20: las opciones tienen orden fijo (no reorder en
// MVP segun el plan B23 Q4), pero indexamos por position para que
// el editor pueda preservar el orden visual al editar.

import { z } from "zod";

export const quizOptionInputSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "La opción no puede estar vacía")
    .max(500, "La opción no puede superar 500 caracteres"),
  isCorrect: z.boolean(),
  position: z
    .number()
    .int()
    .min(1, "La posición debe ser >= 1")
    .max(20, "Demasiadas opciones (máximo 20)"),
});

export type QuizOptionInput = z.infer<typeof quizOptionInputSchema>;

// Refine compartido: exactamente una opcion correcta.
export function hasExactlyOneCorrect(opts: QuizOptionInput[]): boolean {
  return opts.filter((o) => o.isCorrect).length === 1;
}
