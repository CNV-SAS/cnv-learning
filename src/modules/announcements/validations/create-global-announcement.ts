// Validacion del input para emitAnnouncementAction scope='global'.
// Sin courseId (es a toda la plataforma). Mismos limites de
// title/body que course announcement.

import { z } from "zod";

export const createGlobalAnnouncementSchema = z.object({
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

export type CreateGlobalAnnouncementInput = z.infer<
  typeof createGlobalAnnouncementSchema
>;
