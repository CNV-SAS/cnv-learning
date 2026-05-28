// Validacion para createAssignmentAction (Bloque 19.4).
// type=quiz_multiple_choice se acepta como cabecera; el editor de
// preguntas/opciones se difiere a v1.2.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

function nullableTrimmedText(maxLength: number, label: string) {
  return z
    .string()
    .max(maxLength, `${label} no puede superar ${maxLength} caracteres`)
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === "" ? null : t;
    });
}

export const createAssignmentSchema = z.object({
  moduleId: z.string().regex(UUID_FORMAT, "ID de módulo inválido"),
  title: z
    .string()
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(200, "El título no puede superar 200 caracteres"),
  description: nullableTrimmedText(5000, "La descripción"),
  type: z.enum(["file_upload", "essay", "quiz_multiple_choice"]),
  // ISO 8601 datetime (con Z o offset). El client form convierte el
  // datetime-local del HTML a ISO via new Date(value).toISOString()
  // antes de enviar. Null cuando no hay plazo.
  dueAt: z
    .string()
    .datetime("Fecha inválida")
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  maxScore: z
    .number()
    .min(1, "El puntaje máximo debe ser >= 1")
    .max(100, "El puntaje máximo debe ser <= 100"),
  isRequired: z.boolean().default(true),
  // Bloque post-23 ISSUE 3: max_attempts del assignment. 0 = ilimitados.
  // N > 0 = el alumno tiene N entregas; si la N-esima no aprueba el
  // passing_grade del curso, la tarea queda reprobada permanentemente.
  maxAttempts: z
    .number()
    .int("Los intentos deben ser un número entero")
    .min(0, "Los intentos máximos deben ser >= 0")
    .default(0),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
