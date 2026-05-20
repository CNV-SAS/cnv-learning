// Validacion del input para updateEventAction. Bloque 15.
//
// El admin/teacher reedita un evento existente. Permite cambiar
// title, description, startsAt, endsAt. courseId NO se cambia
// (semanticamente es otro evento; se borra y crea).

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const updateEventSchema = z
  .object({
    eventId: z.string().regex(UUID_FORMAT, "ID de evento inválido"),
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

export type UpdateEventInput = z.infer<typeof updateEventSchema>;
