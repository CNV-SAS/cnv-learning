// Validacion del input para editThreadAction. Mismos limites que
// createThread (title 3-200, body 10-10000). El RLS policy
// "Authors update own threads" + el trigger updated_at se encargan
// del resto (autoridad y timestamp).
//
// courseId y forumId llegan solo para revalidatePath; el write usa
// threadId + auth.uid() (RLS).

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const editThreadSchema = z.object({
  threadId: z.string().regex(UUID_FORMAT, "ID de thread inválido"),
  forumId: z.string().regex(UUID_FORMAT, "ID de foro inválido"),
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
    .max(10000, "El cuerpo no puede superar 10000 caracteres"),
});

export type EditThreadInput = z.infer<typeof editThreadSchema>;
