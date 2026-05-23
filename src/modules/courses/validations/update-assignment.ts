import { z } from "zod";

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

export const updateAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(200, "El título no puede superar 200 caracteres"),
  description: nullableTrimmedText(5000, "La descripción"),
  type: z.enum(["file_upload", "essay", "quiz_multiple_choice"]),
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
  isRequired: z.boolean(),
});

export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
