// Zod schema del output esperado del modelo IA para grade.v1.
//
// El prompt instruye al modelo retornar exactamente este shape; la
// configuracion responseMimeType=application/json del SDK ayuda
// pero NO garantiza estructura (el LLM puede alucinar campos
// extra o faltar campos). Este schema es el guard real:
//   - suggestedGrade: number >= 0 o null. null es valido para
//     file_upload donde la IA no puede leer el archivo y no debe
//     inventar nota (peor que no dar nota: confunde al docente). El
//     upper bound (max_score) se valida en el service contra
//     assignment.max_score.
//   - generatedFeedback: string non-empty.

import { z } from "zod";

export const gradeOutputSchema = z.object({
  suggestedGrade: z.number().min(0).nullable(),
  generatedFeedback: z.string().min(1),
});

export type GradeOutput = z.infer<typeof gradeOutputSchema>;
