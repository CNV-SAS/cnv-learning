import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const updateModuleSchema = z.object({
  moduleId: z.string().regex(UUID_FORMAT, "ID de módulo inválido"),
  title: z
    .string()
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(200, "El título no puede superar 200 caracteres"),
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

export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
