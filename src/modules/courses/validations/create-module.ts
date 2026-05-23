// Validacion del input para createModuleAction (Bloque 19.2).
// title 3-200, description nullable max 1000, weight 0-100.
// La validacion de "suma de weights <= 100" del curso se hace en el
// service (requiere fetch de modulos del curso) y no en Zod.

import { z } from "zod";

export const createModuleSchema = z.object({
  courseId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(200, "El título no puede superar 200 caracteres"),
  // Acepta string, null o undefined. Trims y normaliza "" / whitespace
  // a null para persistir consistente con DB nullable.
  description: z
    .string()
    .max(1000, "La descripción no puede superar 1000 caracteres")
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === "" ? null : t;
    }),
  weight: z
    .number()
    .min(0, "El peso debe ser >= 0")
    .max(100, "El peso debe ser <= 100"),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
