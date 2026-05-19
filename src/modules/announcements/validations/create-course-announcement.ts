// Validacion del input para emitAnnouncementAction scope='course'.
// Limites del title/body razonables para un anuncio (subject email
// + body legible). Body se trata como plain text (sin markdown
// render) per consideracion C del plan del Bloque 10.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const createCourseAnnouncementSchema = z.object({
  courseId: z.string().regex(UUID_FORMAT, "ID de curso inválido"),
  title: z
    .string()
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(200, "El título no puede superar 200 caracteres"),
  body: z
    .string()
    .trim()
    .min(10, "El cuerpo debe tener al menos 10 caracteres")
    .max(5000, "El cuerpo no puede superar 5000 caracteres"),
});

export type CreateCourseAnnouncementInput = z.infer<
  typeof createCourseAnnouncementSchema
>;
