// Validacion del input para createReplyAction. Body 1-10000 (reply
// puede ser corta, ej. "Gracias"). Sin title (replies son flat).
//
// courseId y forumId llegan solo para revalidatePath; el write usa
// threadId + auth.uid() (RLS).

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const createReplySchema = z.object({
  threadId: z.string().regex(UUID_FORMAT, "ID de thread inválido"),
  forumId: z.string().regex(UUID_FORMAT, "ID de foro inválido"),
  courseId: z.string().regex(UUID_FORMAT, "ID de curso inválido"),
  body: z
    .string()
    .trim()
    .min(1, "El cuerpo no puede estar vacío")
    .max(10000, "El cuerpo no puede superar 10000 caracteres"),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
