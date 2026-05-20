// Validacion del input para createEventAction. Bloque 15.
//
// Fechas como string YYYY-MM-DD (consistente con postgres date).
// Refine ends_at >= starts_at cuando ambos esten presentes; el
// CHECK constraint en BD valida defense-in-depth.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const createEventSchema = z
  .object({
    courseId: z.string().regex(UUID_FORMAT, "ID de curso inválido"),
    title: z
      .string()
      .trim()
      .min(3, "El título debe tener al menos 3 caracteres")
      .max(200, "El título no puede superar 200 caracteres"),
    description: z
      .string()
      .trim()
      .max(2000, "La descripción no puede superar 2000 caracteres")
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    startsAt: z.string().regex(ISO_DATE, "Fecha de inicio inválida (YYYY-MM-DD)"),
    endsAt: z
      .string()
      .regex(ISO_DATE, "Fecha de fin inválida (YYYY-MM-DD)")
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
  })
  .refine(
    (data) => !data.endsAt || data.endsAt >= data.startsAt,
    {
      message: "La fecha de fin debe ser igual o posterior a la de inicio.",
      path: ["endsAt"],
    },
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;
